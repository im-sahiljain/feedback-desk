/**
 * Provider-aware rate limiter and backoff coordinator.
 * Isolates provider quotas (e.g. Gemini Free Tier 15 RPM) from application business logic.
 */

export interface RateLimiterOptions {
  isFreeTier?: boolean;
}

class ProviderRateLimiter {
  private lastCallFinishedByProvider = new Map<string, number>();
  private throttleChainByProvider = new Map<string, Promise<void>>();

  // Gemini Free tier limit is 15 RPM. 4500ms spacing (~13.3 calls/min) stays safely below it.
  private readonly GEMINI_FREE_INTERVAL_MS = 4500;

  /**
   * Throttles requests if the provider/tier requires it (e.g. Gemini free tier).
   * Local models and paid tiers execute with zero artificial delay.
   */
  async throttle(provider: string, options: RateLimiterOptions = {}): Promise<void> {
    const norm = (provider || 'google').toLowerCase();

    // Local inference and paid tiers do not artificially throttle
    if (norm === 'local' || options.isFreeTier === false) {
      return;
    }

    if (norm === 'google') {
      const currentChain = this.throttleChainByProvider.get(norm) || Promise.resolve();
      let release: () => void = () => {};
      const nextChain = new Promise<void>((resolve) => {
        release = resolve;
      });
      this.throttleChainByProvider.set(norm, nextChain);

      await currentChain;
      try {
        const now = Date.now();
        const lastFinished = this.lastCallFinishedByProvider.get(norm) || 0;
        const waitTime = Math.max(0, this.GEMINI_FREE_INTERVAL_MS - (now - lastFinished));
        if (waitTime > 0) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } finally {
        this.lastCallFinishedByProvider.set(norm, Date.now());
        release();
      }
    }
  }

  /**
   * Notifies cooldown for a given provider (e.g. after receiving a 429).
   */
  notifyCooldown(provider: string, delayMs: number): void {
    const norm = (provider || 'google').toLowerCase();
    const current = this.lastCallFinishedByProvider.get(norm) || 0;
    this.lastCallFinishedByProvider.set(norm, Math.max(current, Date.now() + delayMs));
  }

  /**
   * Computes backoff delay in milliseconds from error messages.
   */
  extractRetryDelayMs(provider: string, errorMsg: string, attempt: number = 1): number {
    const norm = (provider || '').toLowerCase();
    const msg = errorMsg || '';

    // Check for JSON or text retryDelay e.g. "retryDelay": "22s" or "retryDelay": "22.5s"
    const jsonMatch = msg.match(/["']?retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s?["']?/i);
    if (jsonMatch && jsonMatch[1]) {
      const sec = parseFloat(jsonMatch[1]);
      if (!isNaN(sec) && sec > 0) {
        return Math.ceil(sec * 1000) + 2000; // Add 2s safety buffer
      }
    }

    // Check for text e.g. "Please retry in 22.25s" or "retry after 20s"
    const textMatch = msg.match(/retry (?:in|after) (\d+(?:\.\d+)?)s/i);
    if (textMatch && textMatch[1]) {
      const sec = parseFloat(textMatch[1]);
      if (!isNaN(sec) && sec > 0) {
        return Math.ceil(sec * 1000) + 2000;
      }
    }

    // High demand / service unavailable backoff
    if (/503|UNAVAILABLE|high demand|service unavailable/i.test(msg)) {
      return Math.min(30000, attempt * 8000);
    }

    // Provider specific default fallbacks
    if (norm === 'google') {
      return 25000; // Conservative 25s Gemini free-tier replenishment window
    }

    return Math.min(10000, attempt * 2000);
  }
}

export const rateLimiter = new ProviderRateLimiter();

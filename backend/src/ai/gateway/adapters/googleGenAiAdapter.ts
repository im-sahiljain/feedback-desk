import { GoogleGenAI, Type } from '@google/genai';
import {
  LlmAdapter,
  EmbeddingAdapter,
  StructuredPromptRequest,
  StructuredPromptResponse,
  TextPromptRequest,
  TextPromptResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../types.js';
import { estimateCostUsd } from '../pricing.js';
import { rateLimiter } from '../rateLimiter.js';
import { logger } from '../../../logging/logger.js';

export interface GoogleAdapterOptions {
  apiKey: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
  isFreeTier?: boolean;
}

/**
 * Converts standard JSON Schema type strings into GoogleGenAI Type enums if necessary,
 * or preserves compliant schema definitions.
 */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return schema;

  const result: Record<string, unknown> = { ...schema };

  if (typeof result.type === 'string') {
    const t = result.type.toUpperCase();
    if (t in Type) {
      result.type = (Type as Record<string, unknown>)[t];
    }
  }

  if (result.properties && typeof result.properties === 'object') {
    const props = result.properties as Record<string, Record<string, unknown>>;
    const convertedProps: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(props)) {
      convertedProps[key] = toGeminiSchema(val);
    }
    result.properties = convertedProps;
  }

  if (result.items && typeof result.items === 'object') {
    result.items = toGeminiSchema(result.items as Record<string, unknown>);
  }

  return result;
}

export class GoogleGenAiAdapter implements LlmAdapter, EmbeddingAdapter {
  readonly providerName = 'google';
  readonly defaultModel: string;
  readonly defaultEmbeddingModel: string;
  readonly defaultDimensions = 768;

  private apiKey: string;
  private isFreeTier: boolean;
  private client: GoogleGenAI;

  constructor(options: GoogleAdapterOptions) {
    this.apiKey = options.apiKey;
    this.defaultModel = options.defaultModel || 'gemini-3.5-flash-lite';
    this.defaultEmbeddingModel = options.defaultEmbeddingModel || 'gemini-embedding-001';
    this.isFreeTier = options.isFreeTier ?? true;
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async generateStructured<T = unknown>(
    req: StructuredPromptRequest,
  ): Promise<StructuredPromptResponse<T>> {
    const model = req.model || this.defaultModel;
    const maxRetries = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await rateLimiter.throttle('google', { isFreeTier: this.isFreeTier });

        const start = Date.now();
        const geminiSchema = toGeminiSchema(req.schema);

        const response = await this.client.models.generateContent({
          model,
          contents: req.prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: geminiSchema as any,
            temperature: req.temperature ?? 0.1,
            maxOutputTokens: req.maxOutputTokens,
          },
        });

        const latencyMs = Date.now() - start;
        const text = response.text || '{}';
        const parsed = JSON.parse(text) as T;

        const tokenInput =
          response.usageMetadata?.promptTokenCount ?? Math.max(1, Math.ceil(req.prompt.length / 4));
        const tokenOutput =
          response.usageMetadata?.candidatesTokenCount ?? Math.max(1, Math.ceil(text.length / 4));
        const estimatedCostUsd = estimateCostUsd(model, tokenInput, tokenOutput);

        return {
          data: parsed,
          rawText: text,
          provider: this.providerName,
          model,
          tokenInput,
          tokenOutput,
          estimatedCostUsd,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isRateLimit =
          /429|resource_exhausted|quota|retryDelay/i.test(msg) ||
          /503|unavailable|high demand/i.test(msg);

        if (isRateLimit && attempt < maxRetries) {
          const delayMs = rateLimiter.extractRetryDelayMs('google', msg, attempt);
          rateLimiter.notifyCooldown('google', delayMs);
          logger.warn(`[GoogleAdapter] Rate limited on ${model}; retrying in ${delayMs}ms`, {
            attempt,
            delayMs,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        break;
      }
    }

    throw lastError || new Error(`Google AI generation failed for model ${model}`);
  }

  async generateText(req: TextPromptRequest): Promise<TextPromptResponse> {
    const model = req.model || this.defaultModel;
    const maxRetries = 2;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await rateLimiter.throttle('google', { isFreeTier: this.isFreeTier });

        const start = Date.now();
        const response = await this.client.models.generateContent({
          model,
          contents: req.prompt,
          config: {
            temperature: req.temperature ?? 0.1,
            maxOutputTokens: req.maxOutputTokens ?? 1000,
          },
        });

        const latencyMs = Date.now() - start;
        const text = response.text || '';
        const tokenInput =
          response.usageMetadata?.promptTokenCount ?? Math.max(1, Math.ceil(req.prompt.length / 4));
        const tokenOutput =
          response.usageMetadata?.candidatesTokenCount ?? Math.max(1, Math.ceil(text.length / 4));
        const estimatedCostUsd = estimateCostUsd(model, tokenInput, tokenOutput);

        return {
          text,
          provider: this.providerName,
          model,
          tokenInput,
          tokenOutput,
          estimatedCostUsd,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        if (/429|503/i.test(msg) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        break;
      }
    }

    throw lastError || new Error(`Google text generation failed for model ${model}`);
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = req.model || this.defaultEmbeddingModel;
    const dimensions = req.dimensions || this.defaultDimensions;
    const start = Date.now();

    // Using REST endpoint for embedding to preserve exact 768-dim outputDimensionality
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:embedContent`;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: req.text }] },
          outputDimensionality: dimensions,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini embedContent HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }

      const json = await response.json();
      const vector = json.embedding?.values;

      if (!Array.isArray(vector) || vector.length !== dimensions) {
        throw new Error(`Invalid Gemini embedding dimensions; expected ${dimensions}, got ${vector?.length}`);
      }

      const tokenInput = Math.max(1, Math.ceil(req.text.length / 4));

      return {
        vector,
        dimensions,
        provider: this.providerName,
        model,
        tokenInput,
        latencyMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

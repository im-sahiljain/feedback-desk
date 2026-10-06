/**
 * Centralized, typed environment configuration.
 * Required secrets fail closed — no predictable fallbacks.
 */

export type AppEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  env: AppEnv;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  otpHmacSecret: string;
  linkSecret: string;
  corsOrigins: string[];
  geminiApiKey: string | null;
  resendApiKey: string | null;
  resendFromEmail: string;
  workerConcurrency: number;
  /** Non-production: print OTP to terminal and skip email delivery */
  devOtpToConsole: boolean;
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Configuration error: required environment variable ${name} is missing or empty. ` +
        `Set ${name} before starting the application.`
    );
  }
  return value.trim();
}

function optionalEnv(value: string | undefined): string | null {
  if (!value || value.trim() === '') return null;
  return value.trim();
}

function parseEnv(raw: string | undefined): AppEnv {
  if (raw === 'production' || raw === 'test' || raw === 'development') return raw;
  return 'development';
}

let cached: AppConfig | null = null;

/**
 * Load and validate configuration. Call at process startup.
 * Throws a clear Configuration error when required secrets are missing.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseEnv(env.NODE_ENV);

  // In test, allow explicit test secrets via env; still fail if absent.
  const jwtSecret = requireEnv('JWT_SECRET', env.JWT_SECRET);
  let otpSource = env.OTP_HMAC_SECRET;
  if (!otpSource && nodeEnv !== 'production') {
    otpSource = env.JWT_SECRET;
  }
  const otpHmacSecret = requireEnv('OTP_HMAC_SECRET', otpSource);
  const linkSecret = requireEnv('LINK_SECRET', env.LINK_SECRET);
  const databaseUrl = requireEnv('DATABASE_URL', env.DATABASE_URL);

  if (jwtSecret.length < (nodeEnv === 'production' ? 32 : 16)) {
    throw new Error(
      `Configuration error: JWT_SECRET must be at least ${nodeEnv === 'production' ? 32 : 16} characters.`
    );
  }
  if (otpHmacSecret.length < (nodeEnv === 'production' ? 32 : 16)) {
    throw new Error(
      `Configuration error: OTP_HMAC_SECRET must be at least ${nodeEnv === 'production' ? 32 : 16} characters.`
    );
  }
  if (linkSecret.length < (nodeEnv === 'production' ? 32 : 16)) {
    throw new Error(
      `Configuration error: LINK_SECRET must be at least ${nodeEnv === 'production' ? 32 : 16} characters.`
    );
  }

  const corsOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];

  const config: AppConfig = {
    env: nodeEnv,
    port: Number(env.PORT || 5000) || 5000,
    databaseUrl,
    jwtSecret,
    otpHmacSecret,
    linkSecret,
    corsOrigins,
    geminiApiKey: optionalEnv(env.GEMINI_API_KEY),
    resendApiKey: optionalEnv(env.RESEND_API_KEY),
    resendFromEmail: env.RESEND_FROM_EMAIL?.trim() || 'Feedback Desk <noreply@localhost>',
    workerConcurrency: Math.max(1, Number(env.WORKER_CONCURRENCY || 2)),
    // Default on in development/test; set DEV_OTP_TO_CONSOLE=false to send real emails instead
    devOtpToConsole:
      nodeEnv !== 'production' && env.DEV_OTP_TO_CONSOLE !== 'false',
  };

  if (nodeEnv === 'production' && !config.resendApiKey) {
    throw new Error('Configuration error: RESEND_API_KEY is required in production.');
  }

  cached = config;
  return config;
}

export function getConfig(): AppConfig {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}

/** Reset cached config (tests only). */
export function resetConfigCache(): void {
  cached = null;
}

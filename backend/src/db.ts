import pkg from 'pg';
import { getConfig } from './config/env.js';

const { Pool } = pkg;

let pool: InstanceType<typeof Pool> | null = null;

/** Enable TLS when the URL or host clearly needs it (Supabase, Neon, etc.). */
function shouldUseSsl(databaseUrl: string, env: string): boolean {
  if (env === 'production') return true;
  return (
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('supabase') ||
    databaseUrl.includes('pooler') ||
    databaseUrl.includes('neon.tech') ||
    databaseUrl.includes('amazonaws.com')
  );
}

/**
 * Managed providers often use certs Node does not trust by default.
 * Encrypt with TLS; skip strict CA verification for known poolers.
 */
function sslRejectUnauthorized(databaseUrl: string): boolean {
  if (
    databaseUrl.includes('supabase') ||
    databaseUrl.includes('pooler') ||
    databaseUrl.includes('neon.tech')
  ) {
    return false;
  }
  return true;
}

export function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    const config = getConfig();
    const useSsl = shouldUseSsl(config.databaseUrl, config.env);

    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: useSsl
        ? { rejectUnauthorized: sslRejectUnauthorized(config.databaseUrl) }
        : undefined,
      max: 20,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

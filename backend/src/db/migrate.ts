import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db.js';
import { logger } from '../logging/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function ensureMigrationsTable(client: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function runMigrations(options: { exitProcess?: boolean } = {}): Promise<string[]> {
  const pool = getPool();
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    await ensureMigrationsTable(client);

    const dir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const id = file.replace(/\.sql$/, '');
      const existing = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [id]);
      if (existing.rows.length > 0) {
        continue;
      }

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      logger.info('Applying migration', { migration: id });

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
        await client.query('COMMIT');
        applied.push(id);
        logger.info('Migration applied', { migration: id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    return applied;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const applied = await runMigrations();
    logger.info('Migrations complete', { appliedCount: applied.length, applied });
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isDirectRun) {
  // Load dotenv when run as CLI
  await import('dotenv/config');
  const { loadConfig } = await import('../config/env.js');
  loadConfig();
  await main();
}

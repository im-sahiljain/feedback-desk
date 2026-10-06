/**
 * Standalone worker entrypoint (optional). The API process also embeds workers.
 * Use this when running workers as a separate process in the same codebase.
 */
import 'dotenv/config';
import { loadConfig } from '../config/env.js';
import { startWorkers } from './worker.js';
import { logger } from '../logging/logger.js';
import { closePool } from '../db.js';

loadConfig();
const stop = startWorkers();
logger.info('Standalone worker process running');

const shutdown = async () => {
  await stop();
  await closePool();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

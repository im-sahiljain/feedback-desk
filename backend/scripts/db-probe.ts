import 'dotenv/config';
import { resetConfigCache, loadConfig } from '../src/config/env.js';
resetConfigCache();
loadConfig();
import { getPool, closePool } from '../src/db.js';

const pool = getPool();
const r = await pool.query('SELECT 1 as ok');
console.log('db_ok', r.rows[0]);
await closePool();

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restore() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Restoring database from init.sql...');

        const initSqlPath = path.join(__dirname, '../init.sql');
        const sql = fs.readFileSync(initSqlPath, 'utf8');

        await client.query('BEGIN');

        // Force clean slate
        console.log('Dropping old tables...');
        await client.query(`
            DROP TABLE IF EXISTS feedbacks CASCADE;
            DROP TABLE IF EXISTS products CASCADE;
            DROP TABLE IF EXISTS workspaces CASCADE;
        `);

        await client.query(sql);
        await client.query('COMMIT');

        console.log('Database restored successfully from init.sql');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Restore failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

restore();

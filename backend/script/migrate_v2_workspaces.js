import 'dotenv/config';
import { getPool } from '../src/db.js';

async function migrate() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Starting migration v2 (Workspaces)...');
        await client.query('BEGIN');

        // Add description column
        console.log('Adding description column...');
        await client.query(`
            ALTER TABLE workspaces 
            ADD COLUMN IF NOT EXISTS description TEXT
        `);

        // Add industry column
        console.log('Adding industry column...');
        await client.query(`
            ALTER TABLE workspaces 
            ADD COLUMN IF NOT EXISTS industry TEXT
        `);

        await client.query('COMMIT');
        console.log('Migration v2 completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration v2 failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

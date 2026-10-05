import 'dotenv/config';
import { getPool } from '../src/db.js';

async function migrate() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Starting migration v4 (Cleanup)...');
        await client.query('BEGIN');

        // 1. Ensure email column exists (if not already)
        await client.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS email TEXT
        `);

        // 2. Migrate data: If email is empty but visitor_email has val, move it.
        console.log('Migrating old data...');
        await client.query(`
            UPDATE feedbacks 
            SET email = visitor_email 
            WHERE email IS NULL AND visitor_email IS NOT NULL
        `);

        // 3. Drop old column
        console.log('Dropping visitor_email...');
        await client.query(`
            ALTER TABLE feedbacks 
            DROP COLUMN IF EXISTS visitor_email
        `);

        await client.query('COMMIT');
        console.log('Migration v4 completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration v4 failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

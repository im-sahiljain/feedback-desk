import 'dotenv/config';
import { getPool } from '../src/db.js';

async function migrate() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Starting migration v3 (Feedbacks)...');
        await client.query('BEGIN');

        // Rename visitor_email to email
        console.log('Renaming visitor_email to email...');
        await client.query(`
            ALTER TABLE feedbacks 
            RENAME COLUMN visitor_email TO email
        `);

        await client.query('COMMIT');
        console.log('Migration v3 completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration v3 failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

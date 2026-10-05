import 'dotenv/config';
import { getPool } from '../src/db.js';

async function migrate() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Starting migration v5 (Status)...');
        await client.query('BEGIN');

        // 1. Change default value of status to 'Unclassified'
        console.log('Changing default status to Unclassified...');
        await client.query(`
            ALTER TABLE feedbacks 
            ALTER COLUMN status SET DEFAULT 'Unclassified'
        `);

        // 2. Update existing 'New' status to 'Classified' (since they are already analyzed)
        console.log('Migrating existing rows...');
        await client.query(`
            UPDATE feedbacks 
            SET status = 'Classified' 
            WHERE status = 'New'
        `);

        await client.query('COMMIT');
        console.log('Migration v5 completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration v5 failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

import 'dotenv/config';
import { getPool } from '../src/db.js';

async function fixSequence() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Fixing sequence for products table...');
        await client.query('BEGIN');

        // Reset the sequence to the maximum id in the table
        await client.query(`
            SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 0) + 1, false)
        `);

        await client.query('COMMIT');
        console.log('Sequence fixed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Fix sequence failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSequence();

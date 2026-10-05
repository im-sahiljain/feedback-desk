import 'dotenv/config';
import { getPool } from './db.js';

async function migrateToUUID() {
    const pool = getPool();
    try {
        console.log('Starting migration to Supabase UUID for products...');

        // 1. Enable pgcrypto
        await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
        console.log('1. Extension pgcrypto enabled');

        // 2. Add temporary new_id column
        await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();');
        await pool.query('UPDATE products SET new_id = gen_random_uuid() WHERE new_id IS NULL;');
        console.log('2. Temporary UUID column created and populated');

        // 3. Map feedbacks.product_id to new UUID
        const prods = await pool.query('SELECT id, new_id FROM products;');
        for (const p of prods.rows) {
            await pool.query('UPDATE feedbacks SET product_id = $1 WHERE product_id = $2;', [p.new_id, String(p.id)]);
        }
        console.log('3. Feedbacks product_id mapped to UUIDs');

        // 4. Alter products table primary key
        await pool.query('ALTER TABLE products DROP COLUMN id;');
        await pool.query('ALTER TABLE products RENAME COLUMN new_id TO id;');
        await pool.query('ALTER TABLE products ADD PRIMARY KEY (id);');
        await pool.query('ALTER TABLE products ALTER COLUMN id SET DEFAULT gen_random_uuid();');
        await pool.query('ALTER TABLE products ALTER COLUMN created_at SET DEFAULT NOW();');
        console.log('4. Products table schema converted to UUID primary key with DEFAULT gen_random_uuid()');

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await pool.end();
    }
}

migrateToUUID();

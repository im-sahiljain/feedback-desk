import 'dotenv/config';
import { getPool } from './db.js';

async function migrateUsersAndFeedbacksUUID() {
    const pool = getPool();
    try {
        console.log('Starting migration for users.id and feedbacks.id to Supabase UUID...');

        // 1. Ensure pgcrypto extension
        await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        // --- MIGRATE USERS TO UUID ---
        console.log('1. Migrating users table to UUID...');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();');
        await pool.query('UPDATE users SET new_id = gen_random_uuid() WHERE new_id IS NULL;');

        // Change products.user_id column type to text / UUID first
        await pool.query('ALTER TABLE products ALTER COLUMN user_id TYPE text;');

        // Update products.user_id to point to new user UUIDs
        const usersRes = await pool.query('SELECT id, new_id FROM users;');
        for (const u of usersRes.rows) {
            await pool.query('UPDATE products SET user_id = $1 WHERE user_id = $2;', [u.new_id.toString(), String(u.id)]);
        }

        await pool.query('ALTER TABLE users DROP COLUMN id;');
        await pool.query('ALTER TABLE users RENAME COLUMN new_id TO id;');
        await pool.query('ALTER TABLE users ADD PRIMARY KEY (id);');
        await pool.query('ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();');
        await pool.query('ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();');
        console.log('Users migration to UUID complete!');

        // --- MIGRATE FEEDBACKS TO UUID ---
        console.log('2. Migrating feedbacks table to UUID...');
        await pool.query('ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();');
        await pool.query('UPDATE feedbacks SET new_id = gen_random_uuid() WHERE new_id IS NULL;');

        await pool.query('ALTER TABLE feedbacks DROP COLUMN id;');
        await pool.query('ALTER TABLE feedbacks RENAME COLUMN new_id TO id;');
        await pool.query('ALTER TABLE feedbacks ADD PRIMARY KEY (id);');
        await pool.query('ALTER TABLE feedbacks ALTER COLUMN id SET DEFAULT gen_random_uuid();');
        await pool.query('ALTER TABLE feedbacks ALTER COLUMN created_at SET DEFAULT NOW();');
        console.log('Feedbacks migration to UUID complete!');

        console.log('All migrations completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await pool.end();
    }
}

migrateUsersAndFeedbacksUUID();

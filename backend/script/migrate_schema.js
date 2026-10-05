import 'dotenv/config';
import { getPool } from '../src/db.js';

async function migrate() {
    const pool = getPool();
    const client = await pool.connect();

    try {
        console.log('Starting migration...');
        await client.query('BEGIN');

        // 1. Create Users Table
        console.log('Creating users table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create Workspaces Table
        console.log('Creating workspaces table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS workspaces (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Alter Feedbacks Table
        console.log('Updating feedbacks table...');

        // Add workspace_id
        await client.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL
        `);

        // Add visitor_email
        await client.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS visitor_email TEXT
        `);

        // Add rating
        await client.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5)
        `);

        // Add status
        await client.query(`
            ALTER TABLE feedbacks 
            ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New'
        `);

        // Make labels optional (DROP NOT NULL) if it was NOT NULL before, 
        // to match init.sql which has DEFAULT '[]' now.
        // We can set default first then drop not null.
        await client.query(`
            ALTER TABLE feedbacks 
            ALTER COLUMN labels SET DEFAULT '[]'
        `);
        // Note: altering NOT NULL requires knowing if it is currently constrained. 
        // We will just leave it as is if it works, or relax it if needed later.

        // Model outputs were NOT NULL in old schema, became nullable in new schema.
        // We should relax these constraints.
        const colsToRelax = ['category', 'sentiment', 'priority', 'impact', 'scope'];
        for (const col of colsToRelax) {
            await client.query(`
                ALTER TABLE feedbacks 
                ALTER COLUMN ${col} DROP NOT NULL
            `);
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end(); // Close the pool to exit script
    }
}

migrate();

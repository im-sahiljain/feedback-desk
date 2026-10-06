import 'dotenv/config';
import { getPool } from './db.js';

async function migrateProductionSecurity() {
    const pool = getPool();
    try {
        console.log('Running production security database migration...');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        `);

        // Create index on users(email) if not exists for fast auth lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);

        // Create index on feedbacks(product_id) for fast analytics queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_feedbacks_product_id ON feedbacks(product_id);
        `);

        // Create index on feedbacks(created_at) for date filtering
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
        `);

        console.log('Production security migration completed successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await pool.end();
    }
}

migrateProductionSecurity();

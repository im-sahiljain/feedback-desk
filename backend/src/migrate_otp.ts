import 'dotenv/config';
import { getPool } from './db.js';

async function migrateOTP() {
    const pool = getPool();
    try {
        console.log('Adding OTP verification columns to users table...');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
            ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;
        `);

        // Update existing users to be verified so existing accounts are not locked out
        await pool.query(`
            UPDATE users SET is_verified = TRUE WHERE is_verified IS FALSE OR is_verified IS NULL;
        `);

        console.log('OTP migration complete!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await pool.end();
    }
}

migrateOTP();

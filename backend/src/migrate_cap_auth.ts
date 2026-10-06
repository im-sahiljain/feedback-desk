import 'dotenv/config';
import { getPool } from './db.js';

async function migrateAuthTables() {
    const pool = getPool();
    try {
        console.log('Running CAP-style Passwordless & Session Database Migration...');

        // 1. Ensure pgcrypto extension exists for UUIDs
        await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

        // 2. Update users table: allow passwordless, add tracking columns
        await pool.query(`
            ALTER TABLE users 
            ALTER COLUMN password_hash DROP NOT NULL,
            ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active',
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        `);

        // Backfill verified users
        await pool.query(`
            UPDATE users 
            SET email_verified_at = CURRENT_TIMESTAMP 
            WHERE is_verified = TRUE AND email_verified_at IS NULL;
        `);

        // 3. Create auth_otp_challenges table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS auth_otp_challenges (
                challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                destination VARCHAR(255) NOT NULL,
                channel VARCHAR(10) NOT NULL DEFAULT 'email',
                purpose VARCHAR(24) NOT NULL DEFAULT 'login',
                otp_hash TEXT NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                consumed_at TIMESTAMP WITH TIME ZONE,
                attempt_count SMALLINT NOT NULL DEFAULT 0,
                max_attempts SMALLINT NOT NULL DEFAULT 5,
                request_ip VARCHAR(45),
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_otp_challenges_dest ON auth_otp_challenges(destination, purpose, created_at DESC);
        `);

        // 4. Create auth_sessions table for Refresh Tokens & Session tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS auth_sessions (
                session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                refresh_token_hash TEXT NOT NULL UNIQUE,
                user_agent TEXT,
                ip_address VARCHAR(45),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                revoked_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_auth_sessions_hash ON auth_sessions(refresh_token_hash);
        `);

        console.log('CAP-style authentication tables migrated successfully!');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await pool.end();
    }
}

migrateAuthTables();

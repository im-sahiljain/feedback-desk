-- Schema migrations tracking (created by runner if missing)
-- 001: Baseline production schema (idempotent)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  account_status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Allow passwordless (drop NOT NULL on password_hash if present)
DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Products (legacy user_id ownership retained for migration/compat)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Feedbacks with flat analysis columns
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  feedback TEXT NOT NULL,
  email TEXT,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  status TEXT DEFAULT 'received',
  labels JSONB NOT NULL DEFAULT '[]',
  categories TEXT[],
  category_name TEXT,
  sentiment_label TEXT,
  priority_label TEXT,
  confidence TEXT,
  raw_ai_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS category_name TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS sentiment_label TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS priority_label TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS confidence TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS raw_ai_metadata JSONB;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_feedbacks_product_id ON feedbacks(product_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_product_created ON feedbacks(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment ON feedbacks(product_id, sentiment_label);
CREATE INDEX IF NOT EXISTS idx_feedbacks_priority ON feedbacks(product_id, priority_label);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(product_id, status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_categories_gin ON feedbacks USING GIN (categories);

-- Auth OTP challenges
CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  destination VARCHAR(255) NOT NULL,
  channel VARCHAR(10) NOT NULL DEFAULT 'email',
  purpose VARCHAR(24) NOT NULL DEFAULT 'login',
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count SMALLINT NOT NULL DEFAULT 0,
  max_attempts SMALLINT NOT NULL DEFAULT 5,
  request_ip VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_dest ON auth_otp_challenges(destination, purpose, created_at DESC);

-- Auth sessions
CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_hash ON auth_sessions(refresh_token_hash);

-- Executive briefs cache
CREATE TABLE IF NOT EXISTS executive_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL DEFAULT 'all',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  brief JSONB NOT NULL DEFAULT '{}',
  metrics JSONB,
  feedback_count_at_generation INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS period_key TEXT NOT NULL DEFAULT 'all';
ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS brief JSONB DEFAULT '{}';
ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS metrics JSONB;
ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS feedback_count_at_generation INTEGER DEFAULT 0;
ALTER TABLE executive_briefs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_executive_briefs_product ON executive_briefs(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_executive_briefs_product_period
  ON executive_briefs(product_id, period_key);

-- 009: Add system role to users and demo role to organization members
-- Migration is idempotent

-- 1. Add role column to users table with check constraint
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'demo'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Update organization_members role check to include 'demo'
DO $$
BEGIN
  ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
  ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'admin', 'member', 'analyst', 'demo'));
EXCEPTION WHEN others THEN NULL;
END $$;

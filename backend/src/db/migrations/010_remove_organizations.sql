-- 010: Remove organizations and organization_members (direct user-owned product model)
-- Migration is idempotent

-- 1. Ensure all products have user_id populated
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_not_deleted ON products(user_id) WHERE deleted_at IS NULL;

-- 2. Drop organization foreign keys and columns
ALTER TABLE products DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE public_feedback_destinations DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE background_jobs DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE audit_events DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE ai_processing_metrics DROP COLUMN IF EXISTS organization_id CASCADE;

-- 3. Drop organization tables
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

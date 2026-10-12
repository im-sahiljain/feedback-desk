-- 015: Drop idempotency_key and analysis_version from feedbacks table
-- Single-use tokens guarantee idempotency; AI versioning is canonically stored in ai_processing_metrics

ALTER TABLE feedbacks DROP COLUMN IF EXISTS idempotency_key CASCADE;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS analysis_version CASCADE;

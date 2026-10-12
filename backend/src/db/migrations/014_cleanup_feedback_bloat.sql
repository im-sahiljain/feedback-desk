-- 014: Cleanup duplicate telemetry and legacy columns from feedbacks table
-- Telemetry (model_provider, model_name, latency, prompt/schema versions) is canonically stored in ai_processing_metrics

ALTER TABLE feedbacks DROP COLUMN IF EXISTS model_provider;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS model_name;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS prompt_version;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS schema_version;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS processing_latency_ms;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS provider_request_id;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS labels;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS processed_at;

-- 004: Async jobs, feedback processing lifecycle, idempotency, AI versioning

-- Processing status on feedbacks
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS processing_status VARCHAR(32) NOT NULL DEFAULT 'received';
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS analyzing_at TIMESTAMPTZ;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS analysis_failed_at TIMESTAMPTZ;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS submission_fingerprint TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS analysis_version TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS schema_version TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS prompt_version TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS model_provider TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS model_name TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS processing_latency_ms INTEGER;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS provider_request_id TEXT;
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS sanitized_feedback TEXT;

-- Normalize legacy statuses
UPDATE feedbacks SET processing_status = 'analyzed'
WHERE processing_status = 'received'
  AND (status ILIKE 'Classified' OR raw_ai_metadata IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedbacks_idempotency
  ON feedbacks(product_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_fingerprint
  ON feedbacks(product_id, submission_fingerprint, created_at DESC)
  WHERE submission_fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_processing_status
  ON feedbacks(processing_status, created_at);

-- Durable job queue (Postgres-backed)
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying', 'dead')),
  payload JSONB NOT NULL DEFAULT '{}',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type VARCHAR(64),
  resource_id UUID,
  idempotency_key TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  error_meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_by TEXT,
  locked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency
  ON background_jobs(job_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_poll
  ON background_jobs(status, available_at)
  WHERE status IN ('queued', 'retrying');

CREATE INDEX IF NOT EXISTS idx_jobs_resource
  ON background_jobs(resource_type, resource_id);

-- AI processing metrics (operator-facing)
CREATE TABLE IF NOT EXISTS ai_processing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES background_jobs(id) ON DELETE SET NULL,
  feedback_id UUID REFERENCES feedbacks(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  provider TEXT,
  model_name TEXT,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER,
  queue_wait_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  parse_failure BOOLEAN DEFAULT FALSE,
  prompt_version TEXT,
  schema_version TEXT,
  analysis_version TEXT,
  token_input INTEGER,
  token_output INTEGER,
  estimated_cost_usd NUMERIC(12, 6),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_created ON ai_processing_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_org ON ai_processing_metrics(organization_id, created_at DESC);

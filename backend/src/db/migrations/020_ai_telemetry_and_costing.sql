-- Migration 020: Unified Scalable AI Observability & Cost Telemetry
-- Extends ai_processing_metrics with product and user attribution, operation tagging, and metadata

ALTER TABLE ai_processing_metrics 
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation_type VARCHAR(50) NOT NULL DEFAULT 'classification',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Backfill product_id only where matching product exists in products table
UPDATE ai_processing_metrics m
SET product_id = f.product_id::uuid
FROM feedbacks f
JOIN products p ON p.id = f.product_id::uuid
WHERE m.feedback_id = f.id 
  AND m.product_id IS NULL 
  AND f.product_id IS NOT NULL;

-- High-performance composite indexes for admin observability and multi-tenant aggregation
CREATE INDEX IF NOT EXISTS idx_ai_metrics_op_time ON ai_processing_metrics (operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_product_time ON ai_processing_metrics (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_success_time ON ai_processing_metrics (success, created_at DESC);

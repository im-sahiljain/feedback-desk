-- Allow multiple executive brief generations per period (history).
-- Latest row is always fetched with ORDER BY created_at DESC.

DROP INDEX IF EXISTS idx_executive_briefs_product_period;

CREATE INDEX IF NOT EXISTS idx_executive_briefs_product_period_created
  ON executive_briefs (product_id, period_key, created_at DESC);

-- 016_admin_feedback_controls.sql
-- Add admin notes, resolution timestamp, and resolving admin user reference to feedbacks table.
-- Migration is idempotent.

ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_resolved_at ON feedbacks (resolved_at) WHERE resolved_at IS NOT NULL;

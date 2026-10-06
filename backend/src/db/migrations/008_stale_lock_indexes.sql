-- 008: Speed up stale processing-lock reclaim scans
CREATE INDEX IF NOT EXISTS idx_jobs_stale_lock
  ON background_jobs (locked_at)
  WHERE status = 'processing' AND locked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_stale_analyzing
  ON feedbacks (analyzing_at)
  WHERE processing_status = 'analyzing' AND analyzing_at IS NOT NULL AND deleted_at IS NULL;

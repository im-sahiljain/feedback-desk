-- Ensure confidence stores qualitative labels (low|medium|high), not numeric scores.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedbacks'
      AND column_name = 'confidence'
      AND data_type IN ('numeric', 'double precision', 'real', 'integer', 'bigint')
  ) THEN
    ALTER TABLE feedbacks
      ALTER COLUMN confidence TYPE TEXT
      USING CASE
        WHEN confidence IS NULL THEN NULL
        WHEN confidence::numeric >= 0.8 THEN 'high'
        WHEN confidence::numeric >= 0.5 THEN 'medium'
        ELSE 'low'
      END;
  END IF;
END $$;

-- If confidence somehow missing type text, force text (no-op if already text)
DO $$
BEGIN
  ALTER TABLE feedbacks ALTER COLUMN confidence TYPE TEXT USING confidence::text;
EXCEPTION WHEN others THEN
  NULL;
END $$;

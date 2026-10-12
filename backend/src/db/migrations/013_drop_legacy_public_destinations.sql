-- 013: Drop unused legacy public destinations and submit fingerprints
DROP TABLE IF EXISTS public_submit_fingerprints CASCADE;
ALTER TABLE feedbacks DROP COLUMN IF EXISTS public_destination_id CASCADE;
DROP TABLE IF EXISTS public_feedback_destinations CASCADE;

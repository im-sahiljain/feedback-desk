-- 012: Simplify feedback invitations (remove timers, device hash, session secrets, and tags)

ALTER TABLE feedback_invitations DROP COLUMN IF EXISTS device_hash;
ALTER TABLE feedback_invitations DROP COLUMN IF EXISTS session_secret;
ALTER TABLE feedback_invitations DROP COLUMN IF EXISTS session_expires_at;
ALTER TABLE feedback_invitations DROP COLUMN IF EXISTS expires_at;
ALTER TABLE feedback_invitations DROP COLUMN IF EXISTS custom_reference;

-- Simplify status check
ALTER TABLE feedback_invitations DROP CONSTRAINT IF EXISTS feedback_invitations_status_check;
ALTER TABLE feedback_invitations ADD CONSTRAINT feedback_invitations_status_check
  CHECK (status IN ('active', 'completed', 'unclaimed', 'locked', 'expired', 'revoked'));

UPDATE feedback_invitations SET status = 'active' WHERE status = 'unclaimed' OR status = 'locked';

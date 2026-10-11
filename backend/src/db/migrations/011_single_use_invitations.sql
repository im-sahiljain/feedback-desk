-- 011: Single-use customer feedback invitations with device lock and session burn timer
-- Idempotent migration

CREATE TABLE IF NOT EXISTS feedback_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'unclaimed'
    CHECK (status IN ('unclaimed', 'locked', 'completed', 'expired', 'revoked')),
  device_hash TEXT,
  session_secret TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  session_expires_at TIMESTAMPTZ,
  feedback_id UUID REFERENCES feedbacks(id) ON DELETE SET NULL,
  custom_reference VARCHAR(255),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON feedback_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_product ON feedback_invitations(product_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON feedback_invitations(product_id, status);

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS invitation_id UUID
  REFERENCES feedback_invitations(id) ON DELETE SET NULL;

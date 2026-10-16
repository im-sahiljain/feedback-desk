-- Module 1: persistent issue intelligence, audit-friendly feedback evidence and actions.
CREATE TABLE IF NOT EXISTS intelligence_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','planned','resolved','dismissed')),
  assignee TEXT,
  due_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_issues_product ON intelligence_issues(product_id, last_seen DESC);
CREATE TABLE IF NOT EXISTS intelligence_issue_evidence (
  issue_id UUID NOT NULL REFERENCES intelligence_issues(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (issue_id, feedback_id),
  UNIQUE (feedback_id)
);
CREATE INDEX IF NOT EXISTS idx_issue_evidence_feedback ON intelligence_issue_evidence(feedback_id);
CREATE TABLE IF NOT EXISTS intelligence_issue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES intelligence_issues(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issue_events_issue ON intelligence_issue_events(issue_id, created_at DESC);

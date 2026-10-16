-- Module 1 advanced capabilities. All new records remain scoped to a product.
ALTER TABLE intelligence_issues ADD COLUMN IF NOT EXISTS embedding JSONB;
ALTER TABLE intelligence_issues ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical'));
ALTER TABLE intelligence_issues ADD COLUMN IF NOT EXISTS resolution_baseline JSONB;
ALTER TABLE intelligence_issues ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES intelligence_issues(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_issues_active ON intelligence_issues(product_id,status) WHERE merged_into IS NULL;
CREATE TABLE IF NOT EXISTS intelligence_feedback_embeddings (
 feedback_id UUID PRIMARY KEY REFERENCES feedbacks(id) ON DELETE CASCADE,
 product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 model TEXT NOT NULL, embedding JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS intelligence_conversations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL DEFAULT 'Evidence investigation', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS intelligence_messages (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES intelligence_conversations(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK (role IN ('user','assistant')), content TEXT NOT NULL,
 citations JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intelligence_messages_conversation ON intelligence_messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS intelligence_notifications (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 issue_id UUID NOT NULL REFERENCES intelligence_issues(id) ON DELETE CASCADE,
 kind TEXT NOT NULL, window_start DATE NOT NULL, title TEXT NOT NULL,
 seen_at TIMESTAMPTZ, emailed_at TIMESTAMPTZ, email_error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (issue_id,kind,window_start)
);
CREATE INDEX IF NOT EXISTS idx_intelligence_notifications ON intelligence_notifications(product_id,created_at DESC);
CREATE TABLE IF NOT EXISTS intelligence_alert_preferences (
 product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 email_enabled BOOLEAN NOT NULL DEFAULT FALSE, recipient_email TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS intelligence_customer_identities (
 feedback_id UUID PRIMARY KEY REFERENCES feedbacks(id) ON DELETE CASCADE,
 product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 customer_token TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_intelligence_customer_token ON intelligence_customer_identities(product_id,customer_token);
CREATE TABLE IF NOT EXISTS intelligence_customer_optouts (
 product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 customer_token TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(product_id,customer_token)
);

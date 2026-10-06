-- 003: Opaque long-lived public feedback destinations

CREATE TABLE IF NOT EXISTS public_feedback_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_public_dest_token ON public_feedback_destinations(public_token);
CREATE INDEX IF NOT EXISTS idx_public_dest_product ON public_feedback_destinations(product_id);
CREATE INDEX IF NOT EXISTS idx_public_dest_org ON public_feedback_destinations(organization_id);
CREATE INDEX IF NOT EXISTS idx_public_dest_active ON public_feedback_destinations(product_id, status)
  WHERE status = 'active';

ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS public_destination_id UUID
  REFERENCES public_feedback_destinations(id) ON DELETE SET NULL;

-- Seed active destinations for existing products that lack one
DO $$
DECLARE
  r RECORD;
  tok TEXT;
BEGIN
  FOR r IN
    SELECT p.id AS product_id, p.organization_id, p.user_id::uuid AS user_id
    FROM products p
    WHERE p.organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public_feedback_destinations d
        WHERE d.product_id = p.id AND d.status = 'active'
      )
  LOOP
    tok := encode(gen_random_bytes(18), 'base64');
    tok := replace(replace(replace(tok, '+', '-'), '/', '_'), '=', '');
    INSERT INTO public_feedback_destinations (
      organization_id, product_id, public_token, status, created_by
    ) VALUES (
      r.organization_id, r.product_id, tok, 'active', r.user_id
    );
  END LOOP;
END $$;

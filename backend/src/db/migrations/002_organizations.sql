-- 002: Organization / tenant model + RBAC membership

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member', 'analyst')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);

-- Attach products to organizations
ALTER TABLE products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products(organization_id);

-- Attach feedbacks to organizations for tenant-scoped queries
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_feedbacks_organization_id ON feedbacks(organization_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_org_created ON feedbacks(organization_id, created_at DESC);

-- Backfill: create personal org per product owner and assign membership + products
DO $$
DECLARE
  r RECORD;
  org_id UUID;
  existing_org UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT p.user_id::uuid AS user_id, u.email, u.name
    FROM products p
    JOIN users u ON u.id = p.user_id::uuid
    WHERE p.organization_id IS NULL AND p.user_id IS NOT NULL
  LOOP
    SELECT om.organization_id INTO existing_org
    FROM organization_members om
    WHERE om.user_id = r.user_id AND om.role = 'owner'
    LIMIT 1;

    IF existing_org IS NULL THEN
      INSERT INTO organizations (name, slug, created_by)
      VALUES (
        COALESCE(NULLIF(TRIM(r.name), ''), split_part(r.email, '@', 1)) || '''s Organization',
        'org-' || replace(r.user_id::text, '-', ''),
        r.user_id
      )
      RETURNING id INTO org_id;

      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES (org_id, r.user_id, 'owner')
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    ELSE
      org_id := existing_org;
    END IF;

    UPDATE products SET organization_id = org_id
    WHERE user_id::text = r.user_id::text AND organization_id IS NULL;
  END LOOP;

  -- Backfill feedback organization_id from products
  UPDATE feedbacks f
  SET organization_id = p.organization_id
  FROM products p
  WHERE f.product_id::text = p.id::text
    AND f.organization_id IS NULL
    AND p.organization_id IS NOT NULL;
END $$;

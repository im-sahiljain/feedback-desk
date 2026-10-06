import { Pool } from 'pg';
import { HttpError } from '../errors/httpError.js';
import { OrgRole, Permission, roleHasPermission } from '../organizations/roles.js';

export interface Membership {
  organizationId: string;
  userId: string;
  role: OrgRole;
}

export interface ProductAccess {
  productId: string;
  organizationId: string;
  role: OrgRole;
  industry: string | null;
  settings: Record<string, unknown>;
  name: string;
}

export async function requireOrganizationMembership(
  pool: Pool,
  userId: string,
  organizationId: string,
  permission?: Permission
): Promise<Membership> {
  const result = await pool.query<{ organization_id: string; user_id: string; role: OrgRole }>(
    `SELECT organization_id, user_id, role
     FROM organization_members
     WHERE organization_id = $1 AND user_id = $2`,
    [organizationId, userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Resource not found');
  }

  const membership = {
    organizationId: result.rows[0].organization_id,
    userId: result.rows[0].user_id,
    role: result.rows[0].role,
  };

  if (permission && !roleHasPermission(membership.role, permission)) {
    throw new HttpError(403, 'Insufficient permissions');
  }

  return membership;
}

export async function requireProductAccess(
  pool: Pool,
  userId: string,
  productId: string,
  permission: Permission = 'product:read'
): Promise<ProductAccess> {
  const result = await pool.query<{
    id: string;
    organization_id: string;
    industry: string | null;
    settings: Record<string, unknown>;
    name: string;
    role: OrgRole;
  }>(
    `SELECT p.id, p.organization_id, p.industry, p.settings, p.name, om.role
     FROM products p
     JOIN organization_members om
       ON om.organization_id = p.organization_id AND om.user_id = $2
     WHERE p.id = $1
       AND p.deleted_at IS NULL
       AND p.organization_id IS NOT NULL`,
    [productId, userId]
  );

  if (result.rows.length === 0) {
    // Hide existence from other tenants
    throw new HttpError(404, 'Resource not found');
  }

  const row = result.rows[0];
  if (!roleHasPermission(row.role, permission)) {
    throw new HttpError(403, 'Insufficient permissions');
  }

  return {
    productId: row.id,
    organizationId: row.organization_id,
    role: row.role,
    industry: row.industry,
    settings: row.settings || {},
    name: row.name,
  };
}

export async function requireRole(
  pool: Pool,
  userId: string,
  organizationId: string,
  allowed: OrgRole[]
): Promise<Membership> {
  const membership = await requireOrganizationMembership(pool, userId, organizationId);
  if (!allowed.includes(membership.role)) {
    throw new HttpError(403, 'Insufficient permissions');
  }
  return membership;
}

/**
 * Ensure user has a personal organization (for first product create / signup).
 */
export async function ensurePersonalOrganization(
  pool: Pool,
  userId: string,
  displayName?: string
): Promise<string> {
  const existing = await pool.query<{ organization_id: string }>(
    `SELECT organization_id FROM organization_members
     WHERE user_id = $1 AND role = 'owner'
     ORDER BY created_at ASC LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0].organization_id;

  const userRes = await pool.query<{ email: string; name: string | null }>(
    'SELECT email, name FROM users WHERE id = $1',
    [userId]
  );
  const user = userRes.rows[0];
  const name =
    displayName ||
    (user?.name ? `${user.name}'s Organization` : `${(user?.email || 'user').split('@')[0]}'s Organization`);

  const org = await pool.query<{ id: string }>(
    `INSERT INTO organizations (name, slug, created_by)
     VALUES ($1, $2, $3) RETURNING id`,
    [name, `org-${userId.replace(/-/g, '')}`, userId]
  );

  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner')`,
    [org.rows[0].id, userId]
  );

  return org.rows[0].id;
}

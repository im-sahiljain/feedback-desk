import { Pool } from 'pg';
import { HttpError } from '../errors/httpError.js';
import { OrgRole, Permission } from '../organizations/roles.js';

export interface Membership {
  organizationId: string;
  userId: string;
  role: OrgRole;
}

export interface ProductAccess {
  productId: string;
  organizationId?: string;
  userId: string;
  role: OrgRole;
  industry: string | null;
  settings: Record<string, unknown>;
  name: string;
}

const WRITE_PERMISSIONS: Permission[] = [
  'product:create',
  'product:update',
  'product:delete',
  'feedback:delete',
  'settings:update',
  'public_link:manage',
  'org:manage',
  'org:members',
  'org:delete',
];

export async function requireProductAccess(
  pool: Pool,
  userId: string,
  productId: string,
  permission: Permission = 'product:read'
): Promise<ProductAccess> {
  const result = await pool.query<{
    id: string;
    user_id: string;
    industry: string | null;
    settings: Record<string, unknown>;
    name: string;
    role: OrgRole;
  }>(
    `SELECT p.id, p.user_id, p.industry, p.settings, p.name, COALESCE(u.role, 'user') as role
     FROM products p
     JOIN users u ON u.id::text = $2::text
     WHERE p.id::text = $1::text
       AND p.user_id::text = $2::text
       AND p.deleted_at IS NULL`,
    [productId, userId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Resource not found');
  }

  const row = result.rows[0];

  if (WRITE_PERMISSIONS.includes(permission) && row.role === 'demo') {
    throw new HttpError(403, 'User not allowed: This action is disabled in demo mode', 'DEMO_USER_NOT_ALLOWED');
  }

  return {
    productId: row.id,
    userId: row.user_id,
    role: row.role,
    industry: row.industry,
    settings: row.settings || {},
    name: row.name,
    organizationId: row.user_id, // Backwards compatibility for existing references
  };
}

export async function requireOrganizationMembership(
  pool: Pool,
  userId: string,
  _organizationId?: string,
  permission?: Permission
): Promise<Membership> {
  const userRes = await pool.query<{ id: string; role: OrgRole }>(
    `SELECT id, COALESCE(role, 'user') as role FROM users WHERE id::text = $1::text`,
    [userId]
  );

  if (userRes.rows.length === 0) {
    throw new HttpError(404, 'User not found');
  }

  const user = userRes.rows[0];

  if (permission && WRITE_PERMISSIONS.includes(permission) && user.role === 'demo') {
    throw new HttpError(403, 'User not allowed: This action is disabled in demo mode', 'DEMO_USER_NOT_ALLOWED');
  }

  return {
    organizationId: user.id,
    userId: user.id,
    role: user.role,
  };
}

export async function requireRole(
  pool: Pool,
  userId: string,
  _organizationId: string,
  allowed: OrgRole[]
): Promise<Membership> {
  const membership = await requireOrganizationMembership(pool, userId);
  if (!allowed.includes(membership.role)) {
    if (membership.role === 'demo') {
      throw new HttpError(403, 'User not allowed: This action is disabled in demo mode', 'DEMO_USER_NOT_ALLOWED');
    }
    throw new HttpError(403, 'User not allowed: Insufficient permissions', 'FORBIDDEN');
  }
  return membership;
}

/**
 * Backwards compatibility helper: returns userId.
 */
export async function ensurePersonalOrganization(
  _pool: Pool,
  userId: string,
  _displayName?: string
): Promise<string> {
  return userId;
}

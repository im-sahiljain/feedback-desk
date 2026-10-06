import { Pool } from 'pg';
import { generatePublicToken } from '../security/crypto.js';
import { recordAudit } from '../audit/audit.js';
import { HttpError } from '../errors/httpError.js';

export interface PublicDestination {
  id: string;
  organization_id: string;
  product_id: string;
  public_token: string;
  status: 'active' | 'revoked';
  created_at: Date;
  revoked_at: Date | null;
}

export async function getActiveDestinationForProduct(
  pool: Pool,
  productId: string
): Promise<PublicDestination | null> {
  const result = await pool.query<PublicDestination>(
    `SELECT id, organization_id, product_id, public_token, status, created_at, revoked_at
     FROM public_feedback_destinations
     WHERE product_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [productId]
  );
  return result.rows[0] || null;
}

export async function resolvePublicDestination(
  pool: Pool,
  publicToken: string
): Promise<{
  destination: PublicDestination;
  product: { id: string; industry: string | null; settings: Record<string, unknown>; name: string; organization_id: string };
} | null> {
  const result = await pool.query(
    `SELECT d.id, d.organization_id, d.product_id, d.public_token, d.status, d.created_at, d.revoked_at,
            p.industry, p.settings, p.name, p.deleted_at AS product_deleted
     FROM public_feedback_destinations d
     JOIN products p ON p.id = d.product_id
     WHERE d.public_token = $1`,
    [publicToken]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.status !== 'active' || row.revoked_at || row.product_deleted) {
    throw new HttpError(410, 'This feedback link is no longer active');
  }
  return {
    destination: {
      id: row.id,
      organization_id: row.organization_id,
      product_id: row.product_id,
      public_token: row.public_token,
      status: row.status,
      created_at: row.created_at,
      revoked_at: row.revoked_at,
    },
    product: {
      id: row.product_id,
      industry: row.industry,
      settings: row.settings || {},
      name: row.name,
      organization_id: row.organization_id,
    },
  };
}

export async function createDestination(
  pool: Pool,
  input: {
    organizationId: string;
    productId: string;
    createdBy: string;
    ip?: string;
    userAgent?: string;
  }
): Promise<PublicDestination> {
  const token = generatePublicToken();
  const result = await pool.query<PublicDestination>(
    `INSERT INTO public_feedback_destinations
     (organization_id, product_id, public_token, status, created_by)
     VALUES ($1, $2, $3, 'active', $4)
     RETURNING id, organization_id, product_id, public_token, status, created_at, revoked_at`,
    [input.organizationId, input.productId, token, input.createdBy]
  );

  await recordAudit(pool, {
    organizationId: input.organizationId,
    actorUserId: input.createdBy,
    action: 'public_link.generated',
    resourceType: 'public_feedback_destination',
    resourceId: result.rows[0].id,
    metadata: { productId: input.productId },
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });

  return result.rows[0];
}

export async function revokeDestination(
  pool: Pool,
  destinationId: string,
  actorUserId: string,
  organizationId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<void> {
  const result = await pool.query(
    `UPDATE public_feedback_destinations
     SET status = 'revoked', revoked_at = now(), revoked_by = $2, updated_at = now()
     WHERE id = $1 AND status = 'active'
     RETURNING id, product_id`,
    [destinationId, actorUserId]
  );
  if (result.rows.length === 0) {
    throw new HttpError(404, 'Active destination not found');
  }

  await recordAudit(pool, {
    organizationId,
    actorUserId,
    action: 'public_link.revoked',
    resourceType: 'public_feedback_destination',
    resourceId: destinationId,
    metadata: { productId: result.rows[0].product_id },
    ipAddress: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

export async function regenerateDestination(
  pool: Pool,
  productId: string,
  organizationId: string,
  actorUserId: string,
  meta?: { ip?: string; userAgent?: string }
): Promise<PublicDestination> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE public_feedback_destinations
       SET status = 'revoked', revoked_at = now(), revoked_by = $2, updated_at = now()
       WHERE product_id = $1 AND status = 'active'`,
      [productId, actorUserId]
    );

    const token = generatePublicToken();
    const result = await client.query<PublicDestination>(
      `INSERT INTO public_feedback_destinations
       (organization_id, product_id, public_token, status, created_by)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING id, organization_id, product_id, public_token, status, created_at, revoked_at`,
      [organizationId, productId, token, actorUserId]
    );
    await client.query('COMMIT');

    await recordAudit(pool, {
      organizationId,
      actorUserId,
      action: 'public_link.regenerated',
      resourceType: 'public_feedback_destination',
      resourceId: result.rows[0].id,
      metadata: { productId },
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

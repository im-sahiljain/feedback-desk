import { Pool } from 'pg';
import { logger } from '../logging/logger.js';
import { sanitizeObject } from '../logging/logger.js';

export interface AuditInput {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAudit(pool: Pool, input: AuditInput): Promise<void> {
  try {
    const safeMeta = sanitizeObject(input.metadata || {});
    await pool.query(
      `INSERT INTO audit_events
       (organization_id, actor_user_id, action, resource_type, resource_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.organizationId || null,
        input.actorUserId || null,
        input.action,
        input.resourceType || null,
        input.resourceId || null,
        JSON.stringify(safeMeta),
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );
  } catch (err) {
    logger.error('Failed to write audit event', {
      action: input.action,
      error: err instanceof Error ? err.message : 'unknown',
    });
  }
}

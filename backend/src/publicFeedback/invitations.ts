import { Pool } from 'pg';
import { randomBytes } from 'node:crypto';
import { recordAudit } from '../audit/audit.js';
import { HttpError } from '../errors/httpError.js';
import { enqueueJob } from '../jobs/queue.js';
import { JOB_ANALYZE_FEEDBACK } from '../jobs/worker.js';
import { sanitizeForAi } from '../ai/sanitize.js';
import { hashPayload } from '../security/crypto.js';

export interface FeedbackInvitation {
  id: string;
  product_id: string;
  token: string;
  status: 'active' | 'completed';
  feedback_id: string | null;
  created_by: string | null;
  created_at: Date;
  submitted_at: Date | null;
}

export function generateInvitationToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Creates a simple single-use feedback invitation link for a product.
 * Zero customer details required.
 */
export async function createSingleUseInvitation(
  pool: Pool,
  input: {
    productId: string;
    createdBy: string;
    ip?: string;
    userAgent?: string;
  }
): Promise<{ id: string; token: string; path: string }> {
  const token = generateInvitationToken();

  const result = await pool.query<FeedbackInvitation>(
    `INSERT INTO feedback_invitations (product_id, token, status, created_by)
     VALUES ($1, $2, 'active', $3)
     RETURNING id, token`,
    [input.productId, token, input.createdBy]
  );

  const row = result.rows[0];

  await recordAudit(pool, {
    actorUserId: input.createdBy,
    action: 'feedback_invitation.created',
    resourceType: 'feedback_invitation',
    resourceId: row.id,
    metadata: { productId: input.productId },
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });

  return {
    id: row.id,
    token: row.token,
    path: `/f/invite/${row.token}`,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Dispenses a fresh, private single-use invitation token when a customer
 * scans a counter QR code (which encodes a product ID or public token).
 */
export async function dispenseCounterInvitation(
  pool: Pool,
  identifier: string
): Promise<{
  token: string;
  path: string;
  product: { id: string; name: string; industry: string | null };
}> {
  let product: { id: string; name: string; industry: string | null } | null = null;

  if (UUID_RE.test(identifier)) {
    const prodRes = await pool.query<{ id: string; name: string; industry: string | null }>(
      `SELECT id, name, industry FROM products WHERE id = $1 AND deleted_at IS NULL`,
      [identifier]
    );
    if (prodRes.rows[0]) {
      product = prodRes.rows[0];
    }
  }

  if (!product) {
    throw new HttpError(404, 'Product or counter QR code not found.');
  }

  const token = generateInvitationToken();
  const insertRes = await pool.query<{ id: string; token: string }>(
    `INSERT INTO feedback_invitations (product_id, token, status)
     VALUES ($1, $2, 'active')
     RETURNING id, token`,
    [product.id, token]
  );

  const row = insertRes.rows[0];
  return {
    token: row.token,
    path: `/f/invite/${row.token}`,
    product,
  };
}

/**
 * Verifies that a single-use token exists and has not been submitted yet.
 */
export async function verifyInvitation(
  pool: Pool,
  token: string
): Promise<{
  product: { id: string; name: string; industry: string | null };
  token: string;
}> {
  const res = await pool.query(
    `SELECT i.id, i.product_id, i.token, i.status,
            p.name AS product_name, p.industry, p.deleted_at AS product_deleted
     FROM feedback_invitations i
     JOIN products p ON p.id = i.product_id
     WHERE i.token = $1`,
    [token]
  );

  const row = res.rows[0];
  if (!row || row.product_deleted) {
    throw new HttpError(404, 'Feedback link not found');
  }

  if (row.status === 'completed') {
    throw new HttpError(
      410,
      'Feedback has already been submitted for this link. Submissions cannot be edited or resubmitted.'
    );
  }

  return {
    product: { id: row.product_id, name: row.product_name, industry: row.industry },
    token: row.token,
  };
}

/**
 * Submits feedback for a single-use invitation.
 * Atomically marks the invitation 'completed' so it can never be used again.
 */
export async function submitInvitationFeedback(
  pool: Pool,
  input: {
    token: string;
    feedback: string;
    rating?: number | null;
    email?: string | null;
    clientIp?: string;
  }
): Promise<{ feedbackId: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Row-level lock to prevent race conditions
    const res = await client.query(
      `SELECT id, product_id, status FROM feedback_invitations WHERE token = $1 FOR UPDATE`,
      [input.token]
    );

    const invite = res.rows[0];
    if (!invite) throw new HttpError(404, 'Feedback link not found');

    if (invite.status === 'completed') {
      throw new HttpError(
        409,
        'Feedback has already been submitted for this link. Responses cannot be modified or resubmitted.'
      );
    }

    // Anti-Spam Layer 3: Email Cooldown Check (if customer provided email)
    if (input.email && input.email.trim()) {
      const emailCooldownRes = await client.query(
        `SELECT id FROM feedbacks
         WHERE product_id = $1
           AND LOWER(email) = LOWER($2)
           AND received_at > NOW() - INTERVAL '30 days'
         LIMIT 1`,
        [invite.product_id, input.email.trim()]
      );
      if (emailCooldownRes.rows.length > 0) {
        throw new HttpError(
          409,
          'A review from this email address has already been recorded for this product in the last 30 days.'
        );
      }
    }

    const { sanitized } = sanitizeForAi(input.feedback);
    const fingerprint = hashPayload(
      `${invite.product_id}|${input.feedback.toLowerCase().trim()}|${(input.email || '').toLowerCase()}|${input.rating ?? ''}`
    );

    // Insert into feedbacks
    const insertRes = await client.query(
      `INSERT INTO feedbacks
       (product_id, invitation_id, feedback, email, rating,
        status, processing_status, received_at, queued_at, submission_fingerprint, sanitized_feedback)
       VALUES ($1, $2, $3, $4, $5, 'received', 'queued', NOW(), NOW(), $6, $7)
       RETURNING id`,
      [
        invite.product_id,
        invite.id,
        input.feedback.trim(),
        input.email?.trim() || null,
        input.rating ?? null,
        fingerprint,
        sanitized,
      ]
    );

    const feedbackId = insertRes.rows[0].id;

    // Atomically burn the invitation token
    const updateRes = await client.query(
      `UPDATE feedback_invitations
       SET status = 'completed',
           feedback_id = $1,
           submitted_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 AND status != 'completed'`,
      [feedbackId, invite.id]
    );

    if (updateRes.rowCount === 0) {
      throw new HttpError(409, 'Feedback has already been submitted for this link');
    }

    // Enqueue background AI analysis
    await enqueueJob(pool, {
      jobType: JOB_ANALYZE_FEEDBACK,
      payload: { feedbackId },
      resourceType: 'feedback',
      resourceId: feedbackId,
      idempotencyKey: `analyze:${feedbackId}`,
    });

    await client.query('COMMIT');

    return { feedbackId };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

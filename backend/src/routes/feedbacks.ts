import express, { Request, Response } from 'express';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { parsePeriodBounds } from '../executive_brief.js';
import { verifyParams } from '../crypto.js';
import { feedbackSubmitLimiter, publicDestinationLimiter } from '../middleware/rateLimiters.js';
import { requireProductAccess } from '../authz/access.js';
import { resolvePublicDestination } from '../publicFeedback/destinations.js';
import { enqueueJob } from '../jobs/queue.js';
import { JOB_ANALYZE_FEEDBACK } from '../jobs/worker.js';
import { hashPayload } from '../security/crypto.js';
import {
  DEFAULT_FEEDBACK_PAGE_SIZE,
  MAX_FEEDBACK_PAGE_SIZE,
  PUBLIC_SUBMIT_MAX_CHARS,
} from '../config/limits.js';
import { logger } from '../logging/logger.js';
import { HttpError, toSafeClientError } from '../errors/httpError.js';
import { recordAudit } from '../audit/audit.js';
import { sanitizeForAi } from '../ai/sanitize.js';

const router = express.Router();

/**
 * Public opaque destination submit: POST /api/feedbacks/public/:token
 * Also supports legacy signed URL body for backwards compatibility.
 */
async function persistFeedbackAndEnqueue(
  pool: ReturnType<typeof getPool>,
  args: {
    productId: string;
    organizationId: string;
    destinationId: string | null;
    feedback: string;
    email: string;
    rating: number | null;
    idempotencyKey?: string | null;
    clientIp?: string;
  }
) {
  const { sanitized } = sanitizeForAi(args.feedback);
  const fingerprint = hashPayload(
    `${args.productId}|${args.feedback.toLowerCase().trim()}|${(args.email || '').toLowerCase()}|${args.rating ?? ''}`
  );

  // Duplicate protection within 10 minutes
  const dup = await pool.query(
    `SELECT id FROM feedbacks
     WHERE product_id = $1
       AND submission_fingerprint = $2
       AND created_at > now() - interval '10 minutes'
       AND deleted_at IS NULL
     LIMIT 1`,
    [args.productId, fingerprint]
  );
  if (dup.rows[0]) {
    return { id: dup.rows[0].id, duplicate: true as const };
  }

  if (args.idempotencyKey) {
    const existing = await pool.query(
      `SELECT id FROM feedbacks WHERE product_id = $1 AND idempotency_key = $2 LIMIT 1`,
      [args.productId, args.idempotencyKey]
    );
    if (existing.rows[0]) {
      return { id: existing.rows[0].id, duplicate: true as const };
    }
  }

  const insert = await pool.query(
    `INSERT INTO feedbacks
     (product_id, organization_id, public_destination_id, feedback, email, rating,
      status, processing_status, received_at, queued_at, idempotency_key, submission_fingerprint, sanitized_feedback)
     VALUES ($1,$2,$3,$4,$5,$6,'received','queued', now(), now(), $7, $8, $9)
     RETURNING id, created_at`,
    [
      args.productId,
      args.organizationId,
      args.destinationId,
      args.feedback,
      args.email || null,
      args.rating,
      args.idempotencyKey || null,
      fingerprint,
      sanitized,
    ]
  );

  const feedbackId = insert.rows[0].id;

  await enqueueJob(pool, {
    jobType: JOB_ANALYZE_FEEDBACK,
    payload: { feedbackId },
    organizationId: args.organizationId,
    resourceType: 'feedback',
    resourceId: feedbackId,
    idempotencyKey: `analyze:${feedbackId}`,
  });

  if (args.destinationId) {
    await pool.query(
      `INSERT INTO public_submit_fingerprints (destination_id, fingerprint) VALUES ($1, $2)`,
      [args.destinationId, fingerprint]
    );
  }

  return { id: feedbackId, created_at: insert.rows[0].created_at, duplicate: false as const };
}

function validateFeedbackBody(body: Record<string, unknown>, maxChars: number) {
  const feedback = typeof body.feedback === 'string' ? body.feedback.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const rating =
    body.rating !== undefined && body.rating !== null ? Number(body.rating) : null;
  const idempotencyKey =
    typeof body.idempotency_key === 'string'
      ? body.idempotency_key.trim().slice(0, 128)
      : typeof body.idempotencyKey === 'string'
        ? body.idempotencyKey.trim().slice(0, 128)
        : null;

  if (!feedback) throw new HttpError(400, 'feedback text is required');
  if (feedback.length > maxChars) {
    throw new HttpError(400, `feedback text exceeds maximum allowed length of ${maxChars} characters`);
  }
  if (email && email.length > 255) throw new HttpError(400, 'email exceeds maximum allowed length');
  if (email && !email.includes('@')) throw new HttpError(400, 'email is invalid');
  if (rating !== null && (isNaN(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    throw new HttpError(400, 'rating must be an integer between 1 and 5');
  }

  return { feedback, email, rating, idempotencyKey };
}

router.post('/public/:token', feedbackSubmitLimiter, publicDestinationLimiter, async (req: Request, res: Response) => {
  const pool = getPool();
  const maxChars = PUBLIC_SUBMIT_MAX_CHARS;
  try {
    const resolved = await resolvePublicDestination(pool, String(Array.isArray(req.params.token)?req.params.token[0]:req.params.token));
    if (!resolved) {
      return res.status(404).json({ error: 'Feedback link not found' });
    }

    const { feedback, email, rating, idempotencyKey } = validateFeedbackBody(req.body, maxChars);

    const result = await persistFeedbackAndEnqueue(pool, {
      productId: resolved.product.id,
      organizationId: resolved.product.organization_id,
      destinationId: resolved.destination.id,
      feedback,
      email,
      rating,
      idempotencyKey,
      clientIp: req.ip,
    });

    return res.status(result.duplicate ? 200 : 201).json({
      message: result.duplicate
        ? 'Feedback already received'
        : 'Feedback received and queued for analysis',
      id: result.id,
      processing_status: 'queued',
    });
  } catch (err) {
    logger.error('Public feedback submit error', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

/**
 * Legacy signed submit — kept for backwards compatibility with existing printed/shared URLs.
 * Still persists immediately and queues AI asynchronously.
 */
router.post('/submit', feedbackSubmitLimiter, async (req: Request, res: Response) => {
  const productId = req.body.product_id ?? req.body.productId;
  const userId = req.body.user_id ?? req.body.userId;
  const industry = req.body.industry;
  const signature = req.body.signature ?? req.body.sig;
  const expiresAt = req.body.expires_at ?? req.body.expiresAt ?? req.body.exp;
  const maxChars = PUBLIC_SUBMIT_MAX_CHARS;

  try {
    if (!productId || !userId || !industry || !signature) {
      return res.status(400).json({ error: 'product_id, user_id, industry, and signature are required' });
    }

    const { feedback, email, rating, idempotencyKey } = validateFeedbackBody(req.body, maxChars);

    const isValidSignature = verifyParams(
      {
        productId: String(productId),
        userId: String(userId),
        industry: String(industry),
        ...(expiresAt ? { expiresAt } : {}),
      },
      String(signature)
    );

    if (!isValidSignature) {
      return res.status(403).json({ error: 'Invalid or expired signature' });
    }

    const pool = getPool();
    const prodRes = await pool.query(
      `SELECT id, user_id, organization_id, industry, deleted_at
       FROM products WHERE id = $1`,
      [productId]
    );

    if (prodRes.rows.length === 0 || prodRes.rows[0].deleted_at) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (String(prodRes.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Invalid feedback link' });
    }
    if (
      prodRes.rows[0].industry &&
      String(prodRes.rows[0].industry).toLowerCase() !== String(industry).toLowerCase()
    ) {
      return res.status(403).json({ error: 'Invalid feedback link' });
    }
    if (!prodRes.rows[0].organization_id) {
      return res.status(403).json({ error: 'Product is not configured for public feedback' });
    }

    // Prefer active opaque destination if present (legacy URL still works)
    const destRes = await pool.query(
      `SELECT id FROM public_feedback_destinations
       WHERE product_id = $1 AND status = 'active' LIMIT 1`,
      [productId]
    );

    const result = await persistFeedbackAndEnqueue(pool, {
      productId: String(productId),
      organizationId: prodRes.rows[0].organization_id,
      destinationId: destRes.rows[0]?.id || null,
      feedback,
      email,
      rating,
      idempotencyKey,
      clientIp: req.ip,
    });

    return res.status(result.duplicate ? 200 : 201).json({
      message: result.duplicate
        ? 'Feedback already received'
        : 'Feedback received and queued for analysis',
      id: result.id,
      processing_status: 'queued',
    });
  } catch (err) {
    logger.error('Legacy feedback submit error', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.get('/public/:token/meta', feedbackSubmitLimiter, async (req: Request, res: Response) => {
  const pool = getPool();
  try {
    const resolved = await resolvePublicDestination(pool, String(Array.isArray(req.params.token)?req.params.token[0]:req.params.token));
    if (!resolved) return res.status(404).json({ error: 'Feedback link not found' });
    return res.json({
      product_name: resolved.product.name,
      industry: resolved.product.industry,
      token: resolved.destination.public_token,
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.get('/date-groups', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const productId = req.query.product_id as string;
  const categoryFilter = req.query.category as string;
  const sentimentFilter = req.query.sentiment as string;
  const priorityFilter = req.query.priority as string;

  if (!productId) return res.status(400).json({ error: 'product_id is required' });

  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await requireProductAccess(pool, req.user.id, productId, 'feedback:read');

    const conditions: string[] = ['product_id = $1', 'deleted_at IS NULL'];
    const values: unknown[] = [productId];
    let paramIndex = 2;

    if (categoryFilter && categoryFilter !== 'all') {
      conditions.push(`($${paramIndex} = ANY(categories) OR category_name = $${paramIndex})`);
      values.push(categoryFilter);
      paramIndex++;
    }
    if (sentimentFilter && sentimentFilter !== 'all') {
      conditions.push(`LOWER(sentiment_label) = LOWER($${paramIndex})`);
      values.push(sentimentFilter);
      paramIndex++;
    }
    if (priorityFilter && priorityFilter !== 'all') {
      conditions.push(`LOWER(priority_label) LIKE LOWER($${paramIndex})`);
      values.push(`%${priorityFilter}%`);
      paramIndex++;
    }

    const query = `
      SELECT
        TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM-DD') AS date_key,
        TO_CHAR(COALESCE(created_at, NOW()), 'FMDDth FMMonth YYYY') AS formatted_date,
        COUNT(*)::int AS count,
        COUNT(CASE WHEN LOWER(sentiment_label) = 'positive' THEN 1 END)::int AS positive_count,
        COUNT(CASE WHEN LOWER(sentiment_label) = 'negative' THEN 1 END)::int AS negative_count,
        COUNT(CASE WHEN LOWER(sentiment_label) = 'neutral' OR sentiment_label IS NULL THEN 1 END)::int AS neutral_count,
        COUNT(CASE WHEN LOWER(sentiment_label) = 'mixed' THEN 1 END)::int AS mixed_count,
        MAX(TO_CHAR(COALESCE(created_at, NOW()), 'HH12:MI AM')) AS latest_time,
        MIN(TO_CHAR(COALESCE(created_at, NOW()), 'HH12:MI AM')) AS earliest_time
      FROM feedbacks
      WHERE ${conditions.join(' AND ')}
      GROUP BY TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM-DD'),
               TO_CHAR(COALESCE(created_at, NOW()), 'FMDDth FMMonth YYYY')
      ORDER BY date_key DESC
    `;

    const result = await pool.query(query, values);
    return res.json(result.rows);
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.get('/', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const productId = req.query.product_id as string;
  const categoryFilter = req.query.category as string;
  const sentimentFilter = req.query.sentiment as string;
  const priorityFilter = req.query.priority as string;
  const statusFilter = req.query.status as string;
  const dateParam = req.query.date as string;
  const cursor = req.query.cursor as string | undefined;
  const limitRaw = Number(req.query.limit || DEFAULT_FEEDBACK_PAGE_SIZE);
  const limit = Math.min(
    MAX_FEEDBACK_PAGE_SIZE,
    Math.max(1, isNaN(limitRaw) ? DEFAULT_FEEDBACK_PAGE_SIZE : limitRaw)
  );

  if (!productId) return res.status(400).json({ error: 'product_id is required' });

  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await requireProductAccess(pool, req.user.id, productId, 'feedback:read');

    const conditions: string[] = ['product_id = $1', 'deleted_at IS NULL'];
    const values: unknown[] = [productId];
    let paramIndex = 2;

    if (dateParam && dateParam !== 'all') {
      conditions.push(`TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM-DD') = $${paramIndex}`);
      values.push(dateParam);
      paramIndex++;
    }
    if (categoryFilter && categoryFilter !== 'all') {
      conditions.push(`($${paramIndex} = ANY(categories) OR category_name = $${paramIndex})`);
      values.push(categoryFilter);
      paramIndex++;
    }
    if (sentimentFilter && sentimentFilter !== 'all') {
      conditions.push(`LOWER(sentiment_label) = LOWER($${paramIndex})`);
      values.push(sentimentFilter);
      paramIndex++;
    }
    if (priorityFilter && priorityFilter !== 'all') {
      conditions.push(`LOWER(priority_label) LIKE LOWER($${paramIndex})`);
      values.push(`%${priorityFilter}%`);
      paramIndex++;
    }
    if (statusFilter && statusFilter !== 'all') {
      conditions.push(`processing_status = $${paramIndex}`);
      values.push(statusFilter);
      paramIndex++;
    }

    const period = req.query.period as string;
    const customStart = req.query.start_date as string;
    const customEnd = req.query.end_date as string;
    if (period && period !== 'all') {
      const { startDate, endDate } = parsePeriodBounds(period, customStart, customEnd);
      if (startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }
      if (endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }
    }

    // Cursor: base64url of created_at|id
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
        const [cursorTs, cursorId] = decoded.split('|');
        conditions.push(`(created_at, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`);
        values.push(cursorTs, cursorId);
        paramIndex += 2;
      } catch {
        return res.status(400).json({ error: 'Invalid cursor' });
      }
    }

    values.push(limit + 1);
    const query = `
      SELECT
        id, product_id, organization_id, feedback, email, rating, status, processing_status,
        categories, category_name, sentiment_label, priority_label, confidence,
        raw_ai_metadata, analysis_version, created_at, received_at, analyzed_at, analysis_failed_at
      FROM feedbacks
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query(query, values);
    const hasMore = result.rows.length > limit;
    const items = hasMore ? result.rows.slice(0, limit) : result.rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last
      ? Buffer.from(`${new Date(last.created_at).toISOString()}|${last.id}`).toString('base64url')
      : null;

    return res.json({
      items,
      pagination: {
        limit,
        has_more: hasMore,
        next_cursor: nextCursor,
      },
      // Backward-compat: some clients expect a bare array — prefer items going forward
      data: items,
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.delete('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const feedbackId = String(Array.isArray(id) ? id[0] : id);
    const fb = await pool.query(
      `SELECT f.id, f.product_id, f.organization_id
       FROM feedbacks f
       WHERE f.id = $1 AND f.deleted_at IS NULL`,
      [feedbackId]
    );
    if (fb.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const access = await requireProductAccess(pool, req.user.id, fb.rows[0].product_id, 'feedback:delete');

    await pool.query(`UPDATE feedbacks SET deleted_at = now() WHERE id = $1`, [feedbackId]);

    await recordAudit(pool, {
      organizationId: access.organizationId,
      actorUserId: req.user.id,
      action: 'feedback.deleted',
      resourceType: 'feedback',
      resourceId: feedbackId,
    });

    return res.json({ message: 'Feedback deleted' });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

export default router;

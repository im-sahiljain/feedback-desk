import express, { Request, Response } from 'express';
import { getPool } from '../db.js';
import { getQueueDepth } from '../jobs/queue.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { toSafeClientError } from '../errors/httpError.js';

const router = express.Router();

/**
 * Operator metrics — authenticated. Not for end users.
 * Exposes queue depth and recent AI processing aggregates without secrets.
 */
router.get('/metrics', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Only organization owners/admins across any membership can read global-ish ops metrics for their orgs
    const membership = await pool.query(
      `SELECT organization_id, role FROM organization_members
       WHERE user_id = $1 AND role IN ('owner', 'admin')`,
      [req.user.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const orgIds = membership.rows.map((r) => r.organization_id);

    const depth = await getQueueDepth(pool);
    const ai = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE success) AS successes,
         COUNT(*) FILTER (WHERE NOT success) AS failures,
         COUNT(*) FILTER (WHERE parse_failure) AS parse_failures,
         AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS avg_latency_ms,
         AVG(queue_wait_ms) FILTER (WHERE queue_wait_ms IS NOT NULL) AS avg_queue_wait_ms
       FROM ai_processing_metrics
       WHERE organization_id = ANY($1::uuid[])
         AND created_at > now() - interval '24 hours'`,
      [orgIds]
    );

    const submissions = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM feedbacks
       WHERE organization_id = ANY($1::uuid[])
         AND created_at > now() - interval '24 hours'
         AND deleted_at IS NULL`,
      [orgIds]
    );

    return res.json({
      queue: depth,
      last_24h: {
        feedback_submissions: submissions.rows[0].count,
        ai_successes: Number(ai.rows[0].successes || 0),
        ai_failures: Number(ai.rows[0].failures || 0),
        ai_parse_failures: Number(ai.rows[0].parse_failures || 0),
        avg_ai_latency_ms: ai.rows[0].avg_latency_ms ? Number(ai.rows[0].avg_latency_ms) : null,
        avg_queue_wait_ms: ai.rows[0].avg_queue_wait_ms ? Number(ai.rows[0].avg_queue_wait_ms) : null,
      },
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

export default router;

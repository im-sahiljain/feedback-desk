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

    const userProducts = await pool.query<{ id: string }>(
      'SELECT id FROM products WHERE user_id::text = $1::text AND deleted_at IS NULL',
      [req.user.id]
    );
    const productIds = userProducts.rows.map((p) => p.id);

    const depth = await getQueueDepth(pool);
    const ai = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE success) AS successes,
         COUNT(*) FILTER (WHERE NOT success) AS failures,
         COUNT(*) FILTER (WHERE parse_failure) AS parse_failures,
         AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) AS avg_latency_ms,
         AVG(queue_wait_ms) FILTER (WHERE queue_wait_ms IS NOT NULL) AS avg_queue_wait_ms,
         SUM(token_input) FILTER (WHERE token_input IS NOT NULL) AS total_token_input,
         SUM(token_output) FILTER (WHERE token_output IS NOT NULL) AS total_token_output,
         SUM(estimated_cost_usd) FILTER (WHERE estimated_cost_usd IS NOT NULL) AS total_estimated_cost_usd
       FROM ai_processing_metrics
       WHERE created_at > now() - interval '24 hours'`
    );

    const submissions = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM feedbacks
       WHERE (product_id::text = ANY($1::text[]))
         AND created_at > now() - interval '24 hours'
         AND deleted_at IS NULL`,
      [productIds]
    );

    return res.json({
      queue: depth,
      last_24h: {
        feedback_submissions: submissions.rows[0]?.count || 0,
        ai_successes: Number(ai.rows[0]?.successes || 0),
        ai_failures: Number(ai.rows[0]?.failures || 0),
        ai_parse_failures: Number(ai.rows[0]?.parse_failures || 0),
        avg_ai_latency_ms: ai.rows[0]?.avg_latency_ms ? Number(ai.rows[0].avg_latency_ms) : null,
        avg_queue_wait_ms: ai.rows[0]?.avg_queue_wait_ms ? Number(ai.rows[0].avg_queue_wait_ms) : null,
        total_token_input: Number(ai.rows[0]?.total_token_input || 0),
        total_token_output: Number(ai.rows[0]?.total_token_output || 0),
        total_estimated_cost_usd: ai.rows[0]?.total_estimated_cost_usd ? Number(ai.rows[0].total_estimated_cost_usd) : 0,
      },
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

export default router;

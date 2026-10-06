import express, { Response } from 'express';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { getOrGenerateExecutiveBrief, calculateImpactCorrelation, parsePeriodBounds } from '../executive_brief.js';
import { executiveBriefLimiter } from '../middleware/rateLimiters.js';
import { requireProductAccess } from '../authz/access.js';
import { toSafeClientError } from '../errors/httpError.js';
import { logger } from '../logging/logger.js';

const router = express.Router();

router.get('/summary', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const productId = req.query.product_id as string;
  const period = (req.query.period as string) || 'all';
  const customStart = req.query.start_date as string;
  const customEnd = req.query.end_date as string;

  if (!productId) {
    return res.status(400).json({ error: 'product_id is required' });
  }

  const { startDate, endDate, periodKey, periodLabel } = parsePeriodBounds(period, customStart, customEnd);
  const pool = getPool();

  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await requireProductAccess(pool, req.user.id, productId, 'analytics:read');

    const totalQuery = `
      SELECT COUNT(*) FROM feedbacks
      WHERE product_id = $1 AND deleted_at IS NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
    `;

    const sentimentQuery = `
      SELECT sentiment_label as label, COUNT(*) as count
      FROM feedbacks
      WHERE product_id = $1 AND deleted_at IS NULL
        AND sentiment_label IS NOT NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
      GROUP BY sentiment_label
    `;

    const categoryQuery = `
      SELECT tag as label, COUNT(*) as count
      FROM (
        SELECT unnest(COALESCE(categories, ARRAY[category_name])) as tag
        FROM feedbacks
        WHERE product_id = $1 AND deleted_at IS NULL
          AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
      ) sub
      WHERE tag IS NOT NULL AND tag <> ''
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 6
    `;

    const priorityQuery = `
      SELECT COUNT(*)
      FROM feedbacks
      WHERE product_id = $1 AND deleted_at IS NULL
        AND priority_label = 'High Priority'
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
    `;

    const actionItemsQuery = `
      SELECT raw_ai_metadata->'action_items' as action_items
      FROM feedbacks
      WHERE product_id = $1 AND deleted_at IS NULL
        AND raw_ai_metadata->'action_items' IS NOT NULL
        AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const [totalRes, sentimentRes, categoryRes, priorityRes, actionsRes, correlationMetrics] =
      await Promise.all([
        pool.query(totalQuery, [productId, startDate, endDate]),
        pool.query(sentimentQuery, [productId, startDate, endDate]),
        pool.query(categoryQuery, [productId, startDate, endDate]),
        pool.query(priorityQuery, [productId, startDate, endDate]),
        pool.query(actionItemsQuery, [productId, startDate, endDate]),
        calculateImpactCorrelation(productId, pool, startDate, endDate, periodKey, periodLabel),
      ]);

    const uniqueActionItems: string[] = [];
    actionsRes.rows.forEach((r) => {
      if (Array.isArray(r.action_items)) {
        r.action_items.forEach((item: string) => {
          if (item && !uniqueActionItems.includes(item)) uniqueActionItems.push(item);
        });
      }
    });

    return res.json({
      total_feedback: parseInt(totalRes.rows[0].count, 10),
      high_priority_count: parseInt(priorityRes.rows[0].count, 10),
      sentiment_distribution: sentimentRes.rows,
      top_categories: categoryRes.rows,
      action_items: uniqueActionItems.slice(0, 5),
      impact_correlation: correlationMetrics,
      period_key: periodKey,
      period_label: periodLabel,
    });
  } catch (err) {
    logger.error('Analytics summary error', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.get(
  '/executive-brief',
  executiveBriefLimiter,
  authenticateUser as any,
  async (req: AuthenticatedRequest, res: Response) => {
    const productId = req.query.product_id as string;
    const forceRefresh = req.query.refresh === 'true';
    const cacheOnly = req.query.cache_only === 'true';
    const period = ((req.query.period as string) || 'today').toLowerCase();
    const customStart = req.query.start_date as string;
    const customEnd = req.query.end_date as string;

    if (!productId) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    if (period === 'all' || period === 'custom' || period.startsWith('custom_')) {
      return res.status(400).json({
        error: 'AI briefs are only available for Today, Last 7 Days, Last 30 Days, or Last 90 Days.',
      });
    }

    const allowed = new Set(['today', '7d', '30d', '90d']);
    if (!allowed.has(period)) {
      return res.status(400).json({ error: 'Invalid period for AI brief' });
    }

    const pool = getPool();
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      await requireProductAccess(pool, req.user.id, productId, 'brief:read');

      // cache_only: return stored brief for period without running AI
      // refresh=true: regenerate and UPSERT into executive_briefs
      const result = await getOrGenerateExecutiveBrief(
        productId,
        pool,
        forceRefresh && !cacheOnly,
        period,
        customStart,
        customEnd,
        { cacheOnly: cacheOnly && !forceRefresh }
      );

      if (!result.brief) {
        return res.json({
          brief: null,
          metrics: null,
          cached: false,
          available: false,
          message: cacheOnly
            ? 'No stored insights for this period. Generate to create and save them.'
            : 'No analyzed feedback in this period to generate insights.',
        });
      }

      return res.json({ ...result, available: true });
    } catch (err) {
      logger.error('Executive brief error', {
        error: err instanceof Error ? err.message : 'unknown',
      });
      const safe = toSafeClientError(err);
      return res.status(safe.status).json(safe.body);
    }
  }
);

export default router;

import express, { Request, Response } from 'express';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { getOrGenerateExecutiveBrief, calculateImpactCorrelation, parsePeriodBounds } from '../executive_brief.js';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get dashboard metrics with multi-category analytics and period filtering
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all, custom]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Metrics summary
 */
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
        const totalQuery = `
            SELECT COUNT(*) FROM feedbacks 
            WHERE product_id = $1
              AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
              AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
        `;

        const sentimentQuery = `
            SELECT 
                sentiment_label as label, 
                COUNT(*) as count 
            FROM feedbacks 
            WHERE product_id = $1 
              AND sentiment_label IS NOT NULL
              AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
              AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
            GROUP BY sentiment_label
        `;

        // Unnest multi-category array for accurate per-category tag distribution
        const categoryQuery = `
            SELECT 
                tag as label, 
                COUNT(*) as count 
            FROM (
                SELECT unnest(COALESCE(categories, ARRAY[category_name])) as tag
                FROM feedbacks 
                WHERE product_id = $1
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
            WHERE product_id = $1 
              AND priority_label = 'High Priority'
              AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
              AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
        `;

        // Extract top recent action items for executive summary
        const actionItemsQuery = `
            SELECT raw_ai_metadata->'action_items' as action_items
            FROM feedbacks
            WHERE product_id = $1 
              AND raw_ai_metadata->'action_items' IS NOT NULL
              AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
              AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
            ORDER BY created_at DESC
            LIMIT 5
        `;

        const [totalRes, sentimentRes, categoryRes, priorityRes, actionsRes, correlationMetrics] = await Promise.all([
            pool.query(totalQuery, [productId, startDate, endDate]),
            pool.query(sentimentQuery, [productId, startDate, endDate]),
            pool.query(categoryQuery, [productId, startDate, endDate]),
            pool.query(priorityQuery, [productId, startDate, endDate]),
            pool.query(actionItemsQuery, [productId, startDate, endDate]),
            calculateImpactCorrelation(productId, pool, startDate, endDate, periodKey, periodLabel)
        ]);

        const uniqueActionItems: string[] = [];
        actionsRes.rows.forEach(r => {
            if (Array.isArray(r.action_items)) {
                r.action_items.forEach((item: string) => {
                    if (item && !uniqueActionItems.includes(item)) {
                        uniqueActionItems.push(item);
                    }
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
            period_label: periodLabel
        });
    } catch (err: any) {
        console.error('Analytics summary error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/analytics/executive-brief:
 *   get:
 *     summary: Get AI Executive Operational Brief and Impact Correlation with period filtering
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all, custom]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Executive Brief synthesized by AI for the requested period
 */
router.get('/executive-brief', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const productId = req.query.product_id as string;
    const forceRefresh = req.query.refresh === 'true';
    const period = (req.query.period as string) || 'all';
    const customStart = req.query.start_date as string;
    const customEnd = req.query.end_date as string;

    if (!productId) {
        return res.status(400).json({ error: 'product_id is required' });
    }

    const pool = getPool();
    try {
        const result = await getOrGenerateExecutiveBrief(productId, pool, forceRefresh, period, customStart, customEnd);
        return res.json(result);
    } catch (err: any) {
        console.error('Executive brief error:', err);
        return res.status(500).json({ error: err.message || 'Failed to generate executive brief' });
    }
});

export default router;

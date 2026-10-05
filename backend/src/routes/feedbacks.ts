import express, { Request, Response } from 'express';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { classifyImpactSingle } from '../classify_impact.js';
import { parsePeriodBounds } from '../executive_brief.js';

const router = express.Router();

/**
 * @swagger
 * /api/feedbacks/submit:
 *   post:
 *     summary: Public endpoint to submit feedback with multi-aspect deep analysis
 *     tags: [Feedbacks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feedback, product_id]
 *             properties:
 *               product_id: { type: string }
 *               feedback: { type: string }
 *               email: { type: string }
 *               rating: { type: integer }
 *     responses:
 *       201:
 *         description: Feedback submitted and analyzed with deep multi-aspect insights
 */
router.post('/submit', async (req: Request, res: Response) => {
    const { product_id, feedback, email, rating } = req.body;

    if (!product_id || product_id.toString().trim() === '') {
        return res.status(400).json({ error: 'product_id is required and cannot be null' });
    }
    if (!feedback || feedback.toString().trim() === '') {
        return res.status(400).json({ error: 'feedback text is required' });
    }

    const pool = getPool();

    try {
        const prodRes = await pool.query('SELECT settings FROM products WHERE id = $1', [product_id]);
        let customLabels: string[] = [];

        if (prodRes.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        } else {
            const settings = prodRes.rows[0].settings || {};
            if (Array.isArray(settings.categories)) {
                customLabels = settings.categories;
            }
        }

        // Run Next-Level Aspect-Based Deep Analysis
        const analysis = await classifyImpactSingle(feedback, customLabels);

        // Store into flat columns, multi-category text array, and raw JSONB metadata
        const insertQuery = `
            INSERT INTO feedbacks 
            (product_id, feedback, email, rating, categories, category_name, sentiment_label, priority_label, confidence, raw_ai_metadata, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Classified')
            RETURNING id, created_at
        `;

        const values = [
            product_id.toString(),
            feedback,
            email || null,
            rating ? rating.toString() : null,
            analysis.categories, // TEXT[] array
            analysis.category.label,
            analysis.sentiment.label,
            analysis.priority.label,
            analysis.category.score,
            JSON.stringify(analysis)
        ];

        const dbRes = await pool.query(insertQuery, values);

        return res.status(201).json({
            message: 'Feedback submitted and analyzed successfully',
            id: dbRes.rows[0].id,
            analysis: analysis
        });
    } catch (err: any) {
        console.error('Feedback submission error:', err);
        return res.status(500).json({ error: 'Server error: ' + (err.message || err) });
    }
});

/**
 * @swagger
 * /api/feedbacks/date-groups:
 *   get:
 *     summary: Get collapsible date/time groups with metadata and counts for lazy loading
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/date-groups', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const productId = req.query.product_id as string;
    const categoryFilter = req.query.category as string;
    const sentimentFilter = req.query.sentiment as string;
    const priorityFilter = req.query.priority as string;

    if (!productId) {
        return res.status(400).json({ error: 'product_id is required' });
    }

    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const prodCheck = await pool.query('SELECT id FROM products WHERE id = $1 AND user_id = $2', [productId, req.user.id]);
        if (prodCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied to this product' });
        }

        const conditions: string[] = ['product_id = $1'];
        const values: any[] = [productId];
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
                TO_CHAR(COALESCE(created_at, NOW()), 'FMDay, Mon DD, YYYY') AS formatted_date,
                COUNT(*)::int AS count,
                COUNT(CASE WHEN LOWER(sentiment_label) = 'positive' THEN 1 END)::int AS positive_count,
                COUNT(CASE WHEN LOWER(sentiment_label) = 'negative' THEN 1 END)::int AS negative_count,
                COUNT(CASE WHEN LOWER(sentiment_label) = 'neutral' OR sentiment_label IS NULL THEN 1 END)::int AS neutral_count,
                MAX(TO_CHAR(COALESCE(created_at, NOW()), 'HH12:MI AM')) AS latest_time,
                MIN(TO_CHAR(COALESCE(created_at, NOW()), 'HH12:MI AM')) AS earliest_time
            FROM feedbacks
            WHERE ${conditions.join(' AND ')}
            GROUP BY TO_CHAR(COALESCE(created_at, NOW()), 'YYYY-MM-DD'), TO_CHAR(COALESCE(created_at, NOW()), 'FMDay, Mon DD, YYYY')
            ORDER BY date_key DESC
        `;

        const result = await pool.query(query, values);
        return res.json(result.rows);
    } catch (err: any) {
        console.error('List date groups error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/feedbacks:
 *   get:
 *     summary: List feedbacks for a product with multi-category filtering
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: sentiment
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of feedbacks with deep analysis
 */
router.get('/', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const productId = req.query.product_id as string;
    const categoryFilter = req.query.category as string;
    const sentimentFilter = req.query.sentiment as string;
    const priorityFilter = req.query.priority as string;
    const dateParam = req.query.date as string;

    if (!productId) {
        return res.status(400).json({ error: 'product_id is required' });
    }

    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const prodCheck = await pool.query('SELECT id FROM products WHERE id = $1 AND user_id = $2', [productId, req.user.id]);
        if (prodCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied to this product' });
        }

        // Build dynamic query supporting multi-category GIN index queries
        const conditions: string[] = ['product_id = $1'];
        const values: any[] = [productId];
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

        const query = `
            SELECT 
                id,
                product_id,
                feedback,
                email,
                rating,
                status,
                categories,
                category_name,
                sentiment_label,
                priority_label,
                confidence,
                raw_ai_metadata,
                created_at
            FROM feedbacks 
            WHERE ${conditions.join(' AND ')}
            ORDER BY created_at DESC
        `;

        const result = await pool.query(query, values);
        return res.json(result.rows);
    } catch (err: any) {
        console.error('List feedbacks error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/feedbacks/{id}:
 *   delete:
 *     summary: Delete feedback
 *     tags: [Feedbacks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feedback deleted
 */
router.delete('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const query = `
            DELETE FROM feedbacks 
            WHERE id = $1 
            AND product_id IN (SELECT id FROM products WHERE user_id = $2)
            RETURNING id
        `;
        const result = await pool.query(query, [id, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Feedback not found or access denied' });
        }

        return res.json({ message: 'Feedback deleted' });
    } catch (err: any) {
        console.error('Delete feedback error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

export default router;

import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const industryLabelsPath = path.join(__dirname, '../../input_data/Industry_Master_Labels.json');
let INDUSTRY_LABELS: Record<string, string[]> = {};

try {
    const data = fs.readFileSync(industryLabelsPath, 'utf8');
    INDUSTRY_LABELS = JSON.parse(data);
} catch (err) {
    console.error('Error loading industry labels:', err);
}

/**
 * @swagger
 * /api/products/industries:
 *   get:
 *     summary: Get list of industries
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of industries
 *     security:
 *       - bearerAuth: []
 */
router.get('/industries', authenticateUser as any, async (req: Request, res: Response) => {
    return res.json(Object.keys(INDUSTRY_LABELS));
});

/**
 * @swagger
 * /api/products/labels:
 *   get:
 *     summary: Get labels for a specific industry
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: industry
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of labels
 *     security:
 *       - bearerAuth: []
 */
router.get('/labels', authenticateUser as any, async (req: Request, res: Response) => {
    const industry = req.query.industry as string;
    if (!industry || !INDUSTRY_LABELS[industry]) {
        return res.status(400).json({ error: 'Invalid or missing industry' });
    }
    return res.json(INDUSTRY_LABELS[industry]);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products for current user
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workspaces
 */
router.get('/', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const result = await pool.query(
            'SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        return res.json(result.rows);
    } catch (err: any) {
        console.error('List products error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               industry: { type: string }
 *               description: { type: string }
 *               categories: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Product created
 */
router.post('/', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const { name, industry, description, categories } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    if (categories) {
        if (!Array.isArray(categories)) {
            return res.status(400).json({ error: 'Categories must be an array' });
        }
        if (categories.length < 1 || categories.length > 5) {
            return res.status(400).json({ error: 'You must select between 1 and 5 categories' });
        }
    } else if (industry) {
        return res.status(400).json({ error: 'Please select at least one category' });
    }

    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const existing = await pool.query(
            'SELECT id FROM products WHERE user_id = $1 AND name = $2',
            [req.user.id, name]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Product with same name already exists' });
        }

        const settings: any = {};
        if (categories) {
            settings.categories = categories;
        }

        const result = await pool.query(
            'INSERT INTO products (user_id, name, industry, description, settings) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, name, industry, description, settings]
        );
        return res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('Create product error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product details
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workspace details
 *       404:
 *         description: Not found
 */
router.get('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const result = await pool.query(
            'SELECT * FROM products WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Get product error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product settings and custom categories
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               industry: { type: string }
 *               description: { type: string }
 *               categories: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, industry, description, categories, config } = req.body;
    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

        const prodCheck = await pool.query('SELECT * FROM products WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (prodCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const existingSettings = prodCheck.rows[0].settings || {};
        const updatedCategories = categories || config?.categories || existingSettings.categories || [];
        const updatedSettings = {
            ...existingSettings,
            categories: updatedCategories,
            config: config || existingSettings.config || {}
        };

        const updateQuery = `
            UPDATE products
            SET name = COALESCE($1, name),
                industry = COALESCE($2, industry),
                description = COALESCE($3, description),
                settings = $4
            WHERE id = $5 AND user_id = $6
            RETURNING *
        `;

        const result = await pool.query(updateQuery, [
            name || null,
            industry || null,
            description || null,
            JSON.stringify(updatedSettings),
            id,
            req.user.id
        ]);

        return res.json(result.rows[0]);
    } catch (err: any) {
        console.error('Update product error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
    const pool = getPool();
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json({ message: 'Product deleted' });
    } catch (err: any) {
        console.error('Delete product error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
});

export default router;

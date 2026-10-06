import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../db.js';
import { authenticateUser, AuthenticatedRequest } from './auth.js';
import { ensurePersonalOrganization, requireProductAccess } from '../authz/access.js';
import { toSafeClientError } from '../errors/httpError.js';
import { logger } from '../logging/logger.js';
import { recordAudit } from '../audit/audit.js';
import {
  createDestination,
  getActiveDestinationForProduct,
  regenerateDestination,
  revokeDestination,
} from '../publicFeedback/destinations.js';

const router = express.Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const industryLabelsPath = path.join(__dirname, '../../input_data/Industry_Master_Labels.json');
let INDUSTRY_LABELS: Record<string, string[]> = {};

try {
  const data = fs.readFileSync(industryLabelsPath, 'utf8');
  INDUSTRY_LABELS = JSON.parse(data);
} catch (err) {
  logger.error('Error loading industry labels', {
    error: err instanceof Error ? err.message : 'unknown',
  });
}

router.get('/industries', authenticateUser as any, async (_req: Request, res: Response) => {
  return res.json(Object.keys(INDUSTRY_LABELS));
});

router.get('/labels', authenticateUser as any, async (req: Request, res: Response) => {
  const industry = req.query.industry as string;
  if (!industry || !INDUSTRY_LABELS[industry]) {
    return res.status(400).json({ error: 'Invalid or missing industry' });
  }
  return res.json(INDUSTRY_LABELS[industry]);
});

router.get('/', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const result = await pool.query(
      `SELECT p.*
       FROM products p
       JOIN organization_members om ON om.organization_id = p.organization_id
       WHERE om.user_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    logger.error('List products error', { error: err instanceof Error ? err.message : 'unknown' });
    return res.status(500).json({ error: 'Unable to process request' });
  }
});

router.post('/', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const { name, industry, description, categories } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (categories) {
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories must be an array' });
    }
    if (categories.length < 1 || categories.length > 10) {
      return res.status(400).json({ error: 'You must select between 1 and 10 categories' });
    }
  } else if (industry) {
    return res.status(400).json({ error: 'Please select at least one category' });
  }

  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const orgId = await ensurePersonalOrganization(pool, req.user.id);

    const existing = await pool.query(
      'SELECT id FROM products WHERE organization_id = $1 AND name = $2 AND deleted_at IS NULL',
      [orgId, name]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Product with same name already exists' });
    }

    const settings: Record<string, unknown> = {};
    if (categories) settings.categories = categories;

    const result = await pool.query(
      `INSERT INTO products (user_id, organization_id, name, industry, description, settings)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, orgId, name, industry, description, settings]
    );

    const product = result.rows[0];
    await createDestination(pool, {
      organizationId: orgId,
      productId: product.id,
      createdBy: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await recordAudit(pool, {
      organizationId: orgId,
      actorUserId: req.user.id,
      action: 'product.created',
      resourceType: 'product',
      resourceId: product.id,
    });

    const dest = await getActiveDestinationForProduct(pool, product.id);
    return res.status(201).json({
      ...product,
      public_feedback_token: dest?.public_token,
      public_feedback_path: dest ? `/f/${dest.public_token}` : null,
    });
  } catch (err) {
    logger.error('Create product error', { error: err instanceof Error ? err.message : 'unknown' });
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.get('/:id/public-link', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await requireProductAccess(pool, req.user.id, paramId(req.params.id), 'product:read');
    const dest = await getActiveDestinationForProduct(pool, paramId(req.params.id));
    if (!dest) {
      return res.status(404).json({ error: 'No active public feedback link' });
    }
    return res.json({
      token: dest.public_token,
      path: `/f/${dest.public_token}`,
      status: dest.status,
      created_at: dest.created_at,
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.post('/:id/public-link/revoke', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const access = await requireProductAccess(pool, req.user.id, paramId(req.params.id), 'public_link:manage');
    const dest = await getActiveDestinationForProduct(pool, paramId(req.params.id));
    if (!dest) return res.status(404).json({ error: 'No active public feedback link' });
    await revokeDestination(pool, dest.id, req.user.id, access.organizationId, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({ message: 'Public feedback link revoked' });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.post('/:id/public-link/regenerate', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const access = await requireProductAccess(pool, req.user.id, paramId(req.params.id), 'public_link:manage');
    const dest = await regenerateDestination(pool, paramId(req.params.id), access.organizationId, req.user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return res.json({
      token: dest.public_token,
      path: `/f/${dest.public_token}`,
      status: dest.status,
      created_at: dest.created_at,
      message: 'New public feedback link generated. Previous link is now inactive.',
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.get('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await requireProductAccess(pool, req.user.id, paramId(req.params.id), 'product:read');
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL',
      [paramId(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    const dest = await getActiveDestinationForProduct(pool, paramId(req.params.id));
    return res.json({
      ...result.rows[0],
      public_feedback_token: dest?.public_token,
      public_feedback_path: dest ? `/f/${dest.public_token}` : null,
    });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.put('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const id = paramId(req.params.id);
  const { name, industry, description, categories, config } = req.body;
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const access = await requireProductAccess(pool, req.user.id, id, 'product:update');

    const prodCheck = await pool.query('SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL', [id]);
    const existingSettings = prodCheck.rows[0].settings || {};
    const updatedCategories = categories || config?.categories || existingSettings.categories || [];
    const updatedSettings = {
      ...existingSettings,
      categories: updatedCategories,
      config: config || existingSettings.config || {},
    };

    const result = await pool.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           industry = COALESCE($2, industry),
           description = COALESCE($3, description),
           settings = $4
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [name || null, industry || null, description || null, JSON.stringify(updatedSettings), id, access.organizationId]
    );

    await recordAudit(pool, {
      organizationId: access.organizationId,
      actorUserId: req.user.id,
      action: 'product.settings_changed',
      resourceType: 'product',
      resourceId: id,
      metadata: { categoriesChanged: Boolean(categories || config?.categories) },
    });

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Update product error', { error: err instanceof Error ? err.message : 'unknown' });
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

router.delete('/:id', authenticateUser as any, async (req: AuthenticatedRequest, res: Response) => {
  const pool = getPool();
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const access = await requireProductAccess(pool, req.user.id, paramId(req.params.id), 'product:delete');

    // Soft-delete product; cascade soft-delete related feedback; revoke public links
    await pool.query(
      `UPDATE products SET deleted_at = now() WHERE id = $1 AND organization_id = $2`,
      [paramId(req.params.id), access.organizationId]
    );
    await pool.query(
      `UPDATE feedbacks SET deleted_at = now() WHERE product_id = $1 AND deleted_at IS NULL`,
      [paramId(req.params.id)]
    );
    await pool.query(
      `UPDATE public_feedback_destinations
       SET status = 'revoked', revoked_at = now(), revoked_by = $2, updated_at = now()
       WHERE product_id = $1 AND status = 'active'`,
      [paramId(req.params.id), req.user.id]
    );

    await recordAudit(pool, {
      organizationId: access.organizationId,
      actorUserId: req.user.id,
      action: 'product.deleted',
      resourceType: 'product',
      resourceId: paramId(req.params.id),
    });

    return res.json({ message: 'Product deleted' });
  } catch (err) {
    const safe = toSafeClientError(err);
    return res.status(safe.status).json(safe.body);
  }
});

export default router;

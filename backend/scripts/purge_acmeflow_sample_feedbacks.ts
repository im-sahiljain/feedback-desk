/**
 * Hard-delete AcmeFlow sample feedbacks (from acmeflow_sample_feedbacks.json)
 * plus related jobs/metrics and all executive briefs for that product.
 *
 * Usage:
 *   npx tsx scripts/purge_acmeflow_sample_feedbacks.ts
 *   npx tsx scripts/purge_acmeflow_sample_feedbacks.ts --dry-run
 *   npx tsx scripts/purge_acmeflow_sample_feedbacks.ts --all-product
 *     (deletes ALL feedbacks for AcmeFlow, not only sample texts)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i);
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile();
if (process.env.NODE_ENV === 'localhost') process.env.NODE_ENV = 'development';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();

const { getPool, closePool } = await import('../src/db.js');

const USER_EMAIL = (
  process.env.USER_EMAIL ||
  'mr.sahiljain14@gmail.com'
).toLowerCase();
const PRODUCT_NAME = process.env.PRODUCT_NAME || 'AcmeFlow';
const DRY_RUN = process.argv.includes('--dry-run');
const ALL_PRODUCT = process.argv.includes('--all-product');

const texts: string[] = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'input_data/acmeflow_sample_feedbacks.json'),
    'utf8',
  ),
);

const pool = getPool();
const client = await pool.connect();

try {
  const productRes = await client.query(
    `SELECT p.id, p.organization_id, p.name
     FROM products p
     JOIN organization_members om ON om.organization_id = p.organization_id
     JOIN users u ON u.id = om.user_id
     WHERE lower(u.email) = $1
       AND lower(p.name) = lower($2)
       AND p.deleted_at IS NULL
     LIMIT 1`,
    [USER_EMAIL, PRODUCT_NAME],
  );

  if (productRes.rows.length === 0) {
    console.error(`Product "${PRODUCT_NAME}" not found for ${USER_EMAIL}`);
    process.exit(1);
  }

  const product = productRes.rows[0] as {
    id: string;
    organization_id: string;
    name: string;
  };

  const fbSelect = ALL_PRODUCT
    ? await client.query(
        `SELECT id, feedback, created_at
         FROM feedbacks
         WHERE product_id = $1`,
        [product.id],
      )
    : await client.query(
        `SELECT id, feedback, created_at
         FROM feedbacks
         WHERE product_id = $1
           AND feedback = ANY($2::text[])`,
        [product.id, texts],
      );

  const feedbackIds = fbSelect.rows.map((r: { id: string }) => r.id);

  const briefsCount = await client.query(
    `SELECT count(*)::int AS n FROM executive_briefs WHERE product_id = $1`,
    [product.id],
  );

  const jobsCount =
    feedbackIds.length === 0
      ? { rows: [{ n: 0 }] }
      : await client.query(
          `SELECT count(*)::int AS n FROM background_jobs
           WHERE resource_type = 'feedback'
             AND resource_id = ANY($1::uuid[])`,
          [feedbackIds],
        );

  const metricsCount =
    feedbackIds.length === 0
      ? { rows: [{ n: 0 }] }
      : await client.query(
          `SELECT count(*)::int AS n FROM ai_processing_metrics
           WHERE feedback_id = ANY($1::uuid[])`,
          [feedbackIds],
        );

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        allProduct: ALL_PRODUCT,
        product: product.name,
        productId: product.id,
        feedbacksToDelete: feedbackIds.length,
        briefsToDelete: briefsCount.rows[0].n,
        jobsToDelete: jobsCount.rows[0].n,
        metricsToDelete: metricsCount.rows[0].n,
      },
      null,
      2,
    ),
  );

  if (DRY_RUN) {
    console.log('Dry run — nothing deleted.');
    process.exit(0);
  }

  await client.query('BEGIN');

  let deletedMetrics = 0;
  let deletedJobs = 0;
  let deletedFingerprints = 0;
  let deletedFeedbacks = 0;
  let deletedBriefs = 0;

  if (feedbackIds.length > 0) {
    const m = await client.query(
      `DELETE FROM ai_processing_metrics
       WHERE feedback_id = ANY($1::uuid[])
       RETURNING id`,
      [feedbackIds],
    );
    deletedMetrics = m.rowCount ?? 0;

    const j = await client.query(
      `DELETE FROM background_jobs
       WHERE resource_type = 'feedback'
         AND resource_id = ANY($1::uuid[])
       RETURNING id`,
      [feedbackIds],
    );
    deletedJobs = j.rowCount ?? 0;

    // Fingerprints may block re-submit; clear ones tied to this product's destinations
    const fp = await client.query(
      `DELETE FROM public_submit_fingerprints
       WHERE destination_id IN (
         SELECT id FROM public_feedback_destinations WHERE product_id = $1
       )
       RETURNING id`,
      [product.id],
    );
    deletedFingerprints = fp.rowCount ?? 0;

    const f = await client.query(
      `DELETE FROM feedbacks
       WHERE id = ANY($1::uuid[])
       RETURNING id`,
      [feedbackIds],
    );
    deletedFeedbacks = f.rowCount ?? 0;
  }

  const b = await client.query(
    `DELETE FROM executive_briefs
     WHERE product_id = $1
     RETURNING id`,
    [product.id],
  );
  deletedBriefs = b.rowCount ?? 0;

  await client.query('COMMIT');

  console.log(
    JSON.stringify(
      {
        deletedFeedbacks,
        deletedBriefs,
        deletedJobs,
        deletedMetrics,
        deletedFingerprints,
      },
      null,
      2,
    ),
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error(err);
  process.exit(1);
} finally {
  client.release();
  await closePool();
}

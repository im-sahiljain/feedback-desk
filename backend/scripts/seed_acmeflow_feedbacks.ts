/**
 * Seed sample customer feedbacks into AcmeFlow for a given user.
 * Inserts text only (no analysis). Dates are randomized over the last N days.
 * Enqueues the normal analyze job so the worker classifies them.
 *
 * Gemini free-tier note (hit 2026-10-07):
 *   GenerateRequestsPerDayPerProjectPerModel-FreeTier ≈ 20 req/day/model.
 *   Bulk seeds of ~50 jobs will exhaust the daily quota and return long
 *   retryDelay (hours). Prefer BATCH_SIZE / wait for reset before re-seeding.
 *   See: https://ai.google.dev/gemini-api/docs/rate-limits
 *
 * Usage:
 *   npx tsx scripts/seed_acmeflow_feedbacks.ts
 *   npx tsx scripts/seed_acmeflow_feedbacks.ts --dry-run
 *   BATCH_SIZE=15 npx tsx scripts/seed_acmeflow_feedbacks.ts
 *   USER_EMAIL=... PRODUCT_NAME=AcmeFlow DAYS=7 npx tsx scripts/seed_acmeflow_feedbacks.ts
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
const { enqueueJob } = await import('../src/jobs/queue.js');
const { JOB_ANALYZE_FEEDBACK } = await import('../src/jobs/worker.js');
const { hashPayload } = await import('../src/security/crypto.js');
const { sanitizeForAi } = await import('../src/ai/sanitize.js');

const USER_EMAIL = (
  process.env.USER_EMAIL ||
  'mr.sahiljain14@gmail.com'
).toLowerCase();
const PRODUCT_NAME = process.env.PRODUCT_NAME || 'AcmeFlow';
const DAYS = Math.max(1, Number(process.env.DAYS || 7));
/** Cap how many new rows to insert this run (Gemini free tier ≈ 20/day/model). */
const BATCH_SIZE = Math.max(
  1,
  Number(process.env.BATCH_SIZE || process.env.LIMIT || 20),
);
const DRY_RUN = process.argv.includes('--dry-run');

const feedbacksPath = resolve(
  process.cwd(),
  'input_data/acmeflow_sample_feedbacks.json',
);
const allTexts: string[] = JSON.parse(readFileSync(feedbacksPath, 'utf8'));
const texts = allTexts.slice(0, BATCH_SIZE);

if (!Array.isArray(allTexts) || allTexts.length === 0) {
  console.error('No feedback texts found in', feedbacksPath);
  process.exit(1);
}

if (allTexts.length > texts.length) {
  console.warn(
    `BATCH_SIZE=${BATCH_SIZE}: seeding ${texts.length}/${allTexts.length} texts this run (Gemini free tier ≈ 20 generateContent/day/model). Set BATCH_SIZE higher only if quota allows.`,
  );
}

function randomTimestampInLastDays(days: number): Date {
  const now = Date.now();
  const start = now - days * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (now - start));
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const pool = getPool();

try {
  const productRes = await pool.query(
    `SELECT p.id, p.organization_id, p.name, u.email
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
    console.error(
      `Product "${PRODUCT_NAME}" not found for user ${USER_EMAIL}`,
    );
    process.exit(1);
  }

  const product = productRes.rows[0] as {
    id: string;
    organization_id: string;
    name: string;
    email: string;
  };

  const destRes = await pool.query(
    `SELECT id FROM public_feedback_destinations
     WHERE product_id = $1 AND status = 'active'
     LIMIT 1`,
    [product.id],
  );
  const destinationId: string | null = destRes.rows[0]?.id ?? null;

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        user: USER_EMAIL,
        product: product.name,
        productId: product.id,
        organizationId: product.organization_id,
        destinationId,
        count: texts.length,
        totalInFile: allTexts.length,
        batchSize: BATCH_SIZE,
        windowDays: DAYS,
      },
      null,
      2,
    ),
  );

  if (DRY_RUN) {
    console.log('Dry run — no rows inserted.');
    process.exit(0);
  }

  const shuffled = shuffle(texts);
  let inserted = 0;
  let skipped = 0;

  for (const text of shuffled) {
    const feedback = String(text).trim();
    if (!feedback) {
      skipped += 1;
      continue;
    }

    const at = randomTimestampInLastDays(DAYS);
    const { sanitized } = sanitizeForAi(feedback);
    const fingerprint = hashPayload(
      `${product.id}|${feedback.toLowerCase().trim()}||`,
    );

    // Avoid exact duplicates already present for this product
    const existing = await pool.query(
      `SELECT id FROM feedbacks
       WHERE product_id = $1
         AND deleted_at IS NULL
         AND feedback = $2
       LIMIT 1`,
      [product.id, feedback],
    );
    if (existing.rows[0]) {
      skipped += 1;
      console.log(`skip duplicate: ${feedback.slice(0, 60)}…`);
      continue;
    }

    const insert = await pool.query(
      `INSERT INTO feedbacks
       (product_id, organization_id, public_destination_id, feedback, email, rating,
        status, processing_status, created_at, received_at, queued_at,
        submission_fingerprint, sanitized_feedback)
       VALUES ($1,$2,$3,$4,NULL,NULL,'received','queued',$5,$5,$5,$6,$7)
       RETURNING id, created_at`,
      [
        product.id,
        product.organization_id,
        destinationId,
        feedback,
        at.toISOString(),
        fingerprint,
        sanitized,
      ],
    );

    const feedbackId = insert.rows[0].id as string;
    await enqueueJob(pool, {
      jobType: JOB_ANALYZE_FEEDBACK,
      payload: { feedbackId },
      organizationId: product.organization_id,
      resourceType: 'feedback',
      resourceId: feedbackId,
      idempotencyKey: `analyze:${feedbackId}`,
    });

    inserted += 1;
    console.log(
      `queued ${inserted}/${texts.length} @ ${at.toISOString()} — ${feedback.slice(0, 72)}`,
    );
  }

  console.log(
    JSON.stringify({ inserted, skipped, total: texts.length }, null, 2),
  );
  console.log(
    'Analysis will complete via the running API workers. Refresh the dashboard shortly.',
  );
} finally {
  await closePool();
}

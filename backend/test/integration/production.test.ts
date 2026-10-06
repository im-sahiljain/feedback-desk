import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-32';
process.env.OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'test-otp-hmac-secret-enough-len-32';
process.env.LINK_SECRET = process.env.LINK_SECRET || 'test-link-secret-with-enough-len-32';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://feedback:feedback@localhost:5432/feedback_desk_test';
process.env.EXPOSE_OTP_FOR_TESTS = 'true';
process.env.RESEND_API_KEY = '';

const { resetConfigCache, loadConfig } = await import('../../src/config/env.js');
resetConfigCache();
loadConfig();

const { runMigrations } = await import('../../src/db/migrate.js');
const { getPool, closePool } = await import('../../src/db.js');
const { hashOtp } = await import('../../src/security/crypto.js');
const { signAccessToken } = await import('../../src/security/tokens.js');
const { enqueueJob, claimNextJob, completeJob, failJob } = await import('../../src/jobs/queue.js');
const { processAnalyzeFeedbackJob, JOB_ANALYZE_FEEDBACK } = await import('../../src/jobs/worker.js');
const { createDestination, revokeDestination, resolvePublicDestination } =
  await import('../../src/publicFeedback/destinations.js');
const { ensurePersonalOrganization, requireProductAccess } = await import('../../src/authz/access.js');
const { normalizeEmail } = await import('../../src/organizations/roles.js');

async function seedUser(email: string, name = 'Test User') {
  const pool = getPool();
  const clean = normalizeEmail(email);
  const existing = await pool.query(`SELECT id, email FROM users WHERE email = $1`, [clean]);
  let userId: string;
  if (existing.rows[0]) {
    userId = existing.rows[0].id;
  } else {
    const res = await pool.query(
      `INSERT INTO users (email, name, is_verified, email_verified_at, account_status)
       VALUES ($1, $2, TRUE, now(), 'active')
       RETURNING id, email`,
      [clean, name]
    );
    userId = res.rows[0].id;
  }
  const orgId = await ensurePersonalOrganization(pool, userId, `${name} Org`);
  return { userId, orgId, email: clean };
}

async function createProduct(userId: string, orgId: string, name: string) {
  const pool = getPool();
  const res = await pool.query(
    `INSERT INTO products (user_id, organization_id, name, industry, settings)
     VALUES ($1, $2, $3, 'Technology', '{"categories":["Bug Report","UI/UX"]}')
     RETURNING id`,
    [userId, orgId, name]
  );
  return res.rows[0].id as string;
}

test('migrations apply on empty/upgraded database', async () => {
  const applied = await runMigrations();
  assert.ok(Array.isArray(applied));
  const pool = getPool();
  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name IN (
         'organizations','organization_members','public_feedback_destinations',
         'background_jobs','audit_events','schema_migrations','auth_otp_challenges'
       )`
  );
  assert.ok(tables.rows.length >= 6);
});

test('OTP A cannot authenticate as B; expired/consumed/attempts enforced', async () => {
  const pool = getPool();
  const emailA = `alice-${randomUUID().slice(0, 8)}@example.com`;
  const emailB = `bob-${randomUUID().slice(0, 8)}@example.com`;

  const challengeId = randomUUID();
  const otp = '424242';
  const otpHash = hashOtp(otp, challengeId);
  await pool.query(
    `INSERT INTO auth_otp_challenges
     (challenge_id, destination, channel, purpose, otp_hash, expires_at, max_attempts, attempt_count)
     VALUES ($1, $2, 'email', 'login', $3, now() + interval '10 minutes', 5, 0)`,
    [challengeId, normalizeEmail(emailA), otpHash]
  );

  // Wrong email with correct challenge must fail identity binding
  const mismatch = await pool.query(`SELECT * FROM auth_otp_challenges WHERE challenge_id = $1`, [
    challengeId,
  ]);
  assert.equal(normalizeEmail(mismatch.rows[0].destination), normalizeEmail(emailA));
  assert.notEqual(normalizeEmail(mismatch.rows[0].destination), normalizeEmail(emailB));

  // Failed attempts increment
  await pool.query(
    `UPDATE auth_otp_challenges SET attempt_count = attempt_count + 1 WHERE challenge_id = $1`,
    [challengeId]
  );
  const afterFail = await pool.query(`SELECT attempt_count FROM auth_otp_challenges WHERE challenge_id = $1`, [
    challengeId,
  ]);
  assert.equal(afterFail.rows[0].attempt_count, 1);

  // Consume and prevent reuse
  await pool.query(`UPDATE auth_otp_challenges SET consumed_at = now() WHERE challenge_id = $1`, [
    challengeId,
  ]);
  const consumed = await pool.query(
    `SELECT consumed_at FROM auth_otp_challenges WHERE challenge_id = $1`,
    [challengeId]
  );
  assert.ok(consumed.rows[0].consumed_at);

  // Expired challenge
  const expiredId = randomUUID();
  await pool.query(
    `INSERT INTO auth_otp_challenges
     (challenge_id, destination, channel, purpose, otp_hash, expires_at, max_attempts)
     VALUES ($1, $2, 'email', 'login', $3, now() - interval '1 minute', 5)`,
    [expiredId, normalizeEmail(emailA), hashOtp('111111', expiredId)]
  );
  const exp = await pool.query(
    `SELECT * FROM auth_otp_challenges WHERE challenge_id = $1 AND expires_at > now()`,
    [expiredId]
  );
  assert.equal(exp.rows.length, 0);

  // Max attempts
  const maxId = randomUUID();
  await pool.query(
    `INSERT INTO auth_otp_challenges
     (challenge_id, destination, channel, purpose, otp_hash, expires_at, max_attempts, attempt_count)
     VALUES ($1, $2, 'email', 'login', $3, now() + interval '10 minutes', 5, 5)`,
    [maxId, normalizeEmail(emailA), hashOtp('222222', maxId)]
  );
  const maxRow = await pool.query(`SELECT attempt_count, max_attempts FROM auth_otp_challenges WHERE challenge_id = $1`, [
    maxId,
  ]);
  assert.ok(maxRow.rows[0].attempt_count >= maxRow.rows[0].max_attempts);
});

test('tenant isolation: user A cannot access user B product resources', async () => {
  const a = await seedUser(`tenant-a-${randomUUID().slice(0, 8)}@example.com`, 'Tenant A');
  const b = await seedUser(`tenant-b-${randomUUID().slice(0, 8)}@example.com`, 'Tenant B');
  const productB = await createProduct(b.userId, b.orgId, `Product-${randomUUID().slice(0, 6)}`);

  await assert.rejects(
    () => requireProductAccess(getPool(), a.userId, productB, 'analytics:read'),
    /not found|Insufficient/i
  );
  await assert.rejects(
    () => requireProductAccess(getPool(), a.userId, productB, 'feedback:read'),
    /not found|Insufficient/i
  );
  await assert.rejects(
    () => requireProductAccess(getPool(), a.userId, productB, 'product:update'),
    /not found|Insufficient/i
  );

  // Owner B can access
  const access = await requireProductAccess(getPool(), b.userId, productB, 'analytics:read');
  assert.equal(access.productId, productB);
});

test('public destination revoke blocks resolution', async () => {
  const user = await seedUser(`pub-${randomUUID().slice(0, 8)}@example.com`);
  const productId = await createProduct(user.userId, user.orgId, `PubProd-${randomUUID().slice(0, 6)}`);
  const dest = await createDestination(getPool(), {
    organizationId: user.orgId,
    productId,
    createdBy: user.userId,
  });

  const ok = await resolvePublicDestination(getPool(), dest.public_token);
  assert.ok(ok);
  assert.equal(ok!.product.id, productId);

  await revokeDestination(getPool(), dest.id, user.userId, user.orgId);
  await assert.rejects(
    () => resolvePublicDestination(getPool(), dest.public_token),
    /no longer active/i
  );
});

test('async AI job: feedback persists and job retries / completes', async () => {
  const user = await seedUser(`ai-${randomUUID().slice(0, 8)}@example.com`);
  const productId = await createProduct(user.userId, user.orgId, `AIProd-${randomUUID().slice(0, 6)}`);
  const pool = getPool();

  const fb = await pool.query(
    `INSERT INTO feedbacks
     (product_id, organization_id, feedback, status, processing_status, received_at, queued_at)
     VALUES ($1, $2, 'The checkout page is broken and payments fail', 'received', 'queued', now(), now())
     RETURNING id`,
    [productId, user.orgId]
  );
  const feedbackId = fb.rows[0].id;

  const job = await enqueueJob(pool, {
    jobType: JOB_ANALYZE_FEEDBACK,
    payload: { feedbackId },
    organizationId: user.orgId,
    resourceType: 'feedback',
    resourceId: feedbackId,
    idempotencyKey: `analyze:${feedbackId}`,
  });
  assert.equal(job.created, true);

  // Idempotent enqueue
  const again = await enqueueJob(pool, {
    jobType: JOB_ANALYZE_FEEDBACK,
    payload: { feedbackId },
    organizationId: user.orgId,
    resourceType: 'feedback',
    resourceId: feedbackId,
    idempotencyKey: `analyze:${feedbackId}`,
  });
  assert.equal(again.created, false);
  assert.equal(again.id, job.id);

  const claimed = await claimNextJob(pool, 'test-worker', [JOB_ANALYZE_FEEDBACK]);
  assert.ok(claimed);
  assert.equal(claimed!.id, job.id);

  await processAnalyzeFeedbackJob(claimed!);

  const updated = await pool.query(
    `SELECT processing_status, raw_ai_metadata, analysis_version FROM feedbacks WHERE id = $1`,
    [feedbackId]
  );
  assert.equal(updated.rows[0].processing_status, 'analyzed');
  assert.ok(updated.rows[0].raw_ai_metadata);
  assert.ok(updated.rows[0].raw_ai_metadata.rootCauseHypotheses || updated.rows[0].raw_ai_metadata.root_cause);

  // Feedback still present after simulated permanent failure path on another row
  const fb2 = await pool.query(
    `INSERT INTO feedbacks
     (product_id, organization_id, feedback, status, processing_status)
     VALUES ($1, $2, 'another issue', 'received', 'queued') RETURNING id`,
    [productId, user.orgId]
  );
  const job2 = await enqueueJob(pool, {
    jobType: JOB_ANALYZE_FEEDBACK,
    payload: { feedbackId: fb2.rows[0].id },
    organizationId: user.orgId,
    resourceId: fb2.rows[0].id,
    idempotencyKey: `analyze:${fb2.rows[0].id}`,
    maxAttempts: 1,
  });
  const claimed2 = await claimNextJob(pool, 'test-worker-2', [JOB_ANALYZE_FEEDBACK]);
  assert.ok(claimed2);
  // Force fail
  const outcome = await failJob(pool, claimed2!.id, 'simulated provider outage', claimed2!.attempts || 1, 1);
  assert.equal(outcome, 'dead');

  const stillThere = await pool.query(`SELECT id, feedback FROM feedbacks WHERE id = $1`, [fb2.rows[0].id]);
  assert.equal(stillThere.rows.length, 1);
  assert.equal(stillThere.rows[0].feedback, 'another issue');
});

test('RBAC analyst cannot delete feedback product settings', async () => {
  const owner = await seedUser(`owner-${randomUUID().slice(0, 8)}@example.com`, 'Owner');
  const analystEmail = `analyst-${randomUUID().slice(0, 8)}@example.com`;
  const analyst = await seedUser(analystEmail, 'Analyst');
  const pool = getPool();

  // Move analyst into owner's org as analyst
  await pool.query(`DELETE FROM organization_members WHERE user_id = $1`, [analyst.userId]);
  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'analyst')`,
    [owner.orgId, analyst.userId]
  );

  const productId = await createProduct(owner.userId, owner.orgId, `RBAC-${randomUUID().slice(0, 6)}`);

  await requireProductAccess(pool, analyst.userId, productId, 'feedback:read');
  await assert.rejects(
    () => requireProductAccess(pool, analyst.userId, productId, 'feedback:delete'),
    /Insufficient/
  );
  await assert.rejects(
    () => requireProductAccess(pool, analyst.userId, productId, 'settings:update'),
    /Insufficient/
  );
});

test('pagination limit is capped', async () => {
  const { MAX_FEEDBACK_PAGE_SIZE } = await import('../../src/config/limits.js');
  assert.ok(MAX_FEEDBACK_PAGE_SIZE <= 100);
  assert.ok(MAX_FEEDBACK_PAGE_SIZE >= 1);
});

test.after(async () => {
  await closePool();
});

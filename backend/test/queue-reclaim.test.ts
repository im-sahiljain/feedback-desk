import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-32';
process.env.OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'test-otp-hmac-secret-enough-len-32';
process.env.LINK_SECRET = process.env.LINK_SECRET || 'test-link-secret-with-enough-len-32';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://feedback:feedback@localhost:5432/feedback_desk_test';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();

const { reclaimStaleLocks } = await import('../src/jobs/queue.js');

function createMockPool(responses: Array<{ rows: unknown[]; rowCount?: number }>) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let idx = 0;

  const client = {
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }
      const next = responses[idx++] ?? { rows: [], rowCount: 0 };
      return { rows: next.rows, rowCount: next.rowCount ?? next.rows.length };
    },
    release: () => undefined,
  };

  return {
    pool: {
      connect: async () => client,
    } as any,
    queries,
  };
}

test('jobLockTimeoutSeconds defaults to 1800 and enforces minimum 60', () => {
  resetConfigCache();
  const prev = process.env.JOB_LOCK_TIMEOUT_SECONDS;
  delete process.env.JOB_LOCK_TIMEOUT_SECONDS;
  const cfg = loadConfig();
  assert.equal(cfg.jobLockTimeoutSeconds, 1800);

  resetConfigCache();
  process.env.JOB_LOCK_TIMEOUT_SECONDS = '30';
  const cfgMin = loadConfig();
  assert.equal(cfgMin.jobLockTimeoutSeconds, 60);

  resetConfigCache();
  process.env.JOB_LOCK_TIMEOUT_SECONDS = '900';
  const cfgCustom = loadConfig();
  assert.equal(cfgCustom.jobLockTimeoutSeconds, 900);

  if (prev === undefined) delete process.env.JOB_LOCK_TIMEOUT_SECONDS;
  else process.env.JOB_LOCK_TIMEOUT_SECONDS = prev;
  resetConfigCache();
  loadConfig();
});

test('reclaimStaleLocks requeues stale processing jobs and analyzing feedback', async () => {
  const feedbackId = '11111111-1111-4111-a111-111111111111';
  const { pool, queries } = createMockPool([
    // UPDATE background_jobs RETURNING
    {
      rows: [{ id: 'job-1', resource_id: feedbackId }],
      rowCount: 1,
    },
    // UPDATE linked feedbacks
    { rows: [{ id: feedbackId }], rowCount: 1 },
    // UPDATE orphan feedbacks
    { rows: [], rowCount: 0 },
    // revive terminal jobs
    { rows: [], rowCount: 0 },
    // insert missing jobs
    { rows: [], rowCount: 0 },
  ]);

  const result = await reclaimStaleLocks(pool, 1800);
  assert.equal(result.jobsReclaimed, 1);
  assert.equal(result.feedbackReset, 1);
  assert.equal(result.jobsEnsured, 0);

  const jobUpdate = queries.find((q) =>
    q.sql.includes("SET status = 'queued'") && q.sql.includes('background_jobs')
  );
  assert.ok(jobUpdate);
  assert.equal(jobUpdate!.params[0], 1800);
  assert.ok(jobUpdate!.sql.includes('status = \'processing\''));
  assert.ok(jobUpdate!.sql.includes('locked_at'));
});

test('reclaimStaleLocks enforces minimum timeout of 60 seconds', async () => {
  const { pool, queries } = createMockPool([
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
    { rows: [], rowCount: 0 },
  ]);

  await reclaimStaleLocks(pool, 10);
  const jobUpdate = queries.find((q) => q.sql.includes('make_interval'));
  assert.ok(jobUpdate);
  assert.equal(jobUpdate!.params[0], 60);
});

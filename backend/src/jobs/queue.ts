import { Pool } from 'pg';
import { logger } from '../logging/logger.js';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying' | 'dead';

export interface EnqueueJobInput {
  jobType: string;
  payload: Record<string, unknown>;
  organizationId?: string | null;
  resourceType?: string;
  resourceId?: string;
  idempotencyKey?: string;
  maxAttempts?: number;
  availableAt?: Date;
}

export async function enqueueJob(pool: Pool, input: EnqueueJobInput): Promise<{ id: string; created: boolean }> {
  if (input.idempotencyKey) {
    const existing = await pool.query<{ id: string; status: string }>(
      `SELECT id, status FROM background_jobs
       WHERE job_type = $1 AND idempotency_key = $2`,
      [input.jobType, input.idempotencyKey]
    );
    if (existing.rows[0]) {
      return { id: existing.rows[0].id, created: false };
    }
  }

  try {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO background_jobs
       (job_type, status, payload, organization_id, resource_type, resource_id, idempotency_key, max_attempts, available_at)
       VALUES ($1, 'queued', $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.jobType,
        JSON.stringify(input.payload),
        input.organizationId || null,
        input.resourceType || null,
        input.resourceId || null,
        input.idempotencyKey || null,
        input.maxAttempts ?? 5,
        input.availableAt || new Date(),
      ]
    );
    return { id: result.rows[0].id, created: true };
  } catch (err: unknown) {
    // Unique violation on idempotency — race
    const existing = input.idempotencyKey
      ? await pool.query<{ id: string }>(
          `SELECT id FROM background_jobs WHERE job_type = $1 AND idempotency_key = $2`,
          [input.jobType, input.idempotencyKey]
        )
      : { rows: [] as { id: string }[] };
    if (existing.rows[0]) {
      return { id: existing.rows[0].id, created: false };
    }
    throw err;
  }
}

export async function claimNextJob(
  pool: Pool,
  workerId: string,
  jobTypes?: string[]
): Promise<{
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  organization_id: string | null;
  resource_id: string | null;
  created_at: Date;
} | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const typeFilter = jobTypes && jobTypes.length > 0 ? `AND job_type = ANY($1::text[])` : '';
    const selectParams: unknown[] = jobTypes && jobTypes.length > 0 ? [jobTypes] : [];

    const result = await client.query(
      `SELECT id, job_type, payload, attempts, max_attempts, organization_id, resource_id, created_at
       FROM background_jobs
       WHERE status IN ('queued', 'retrying')
         AND available_at <= now()
         ${typeFilter}
       ORDER BY available_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
      selectParams
    );

    if (result.rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const job = result.rows[0];
    await client.query(
      `UPDATE background_jobs
       SET status = 'processing',
           attempts = attempts + 1,
           started_at = COALESCE(started_at, now()),
           locked_by = $2,
           locked_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [job.id, workerId]
    );
    await client.query('COMMIT');
    return job;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function backoffSeconds(attempt: number): number {
  // Exponential: 30s, 60s, 120s, 240s, 480s (capped)
  return Math.min(30 * Math.pow(2, Math.max(0, attempt - 1)), 900);
}

export async function completeJob(pool: Pool, jobId: string): Promise<void> {
  await pool.query(
    `UPDATE background_jobs
     SET status = 'completed', completed_at = now(), updated_at = now(), last_error = NULL,
         locked_by = NULL, locked_at = NULL
     WHERE id = $1`,
    [jobId]
  );
}

export async function failJob(pool: Pool, jobId: string, errorMessage: string, attempts: number, maxAttempts: number): Promise<'retrying' | 'dead'> {
  const sanitized = errorMessage.slice(0, 500).replace(/\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, '[REDACTED]');

  if (attempts >= maxAttempts) {
    await pool.query(
      `UPDATE background_jobs
       SET status = 'dead',
           last_error = $2,
           error_meta = jsonb_build_object('terminal', true, 'at', now()),
           completed_at = now(),
           updated_at = now(),
           locked_by = NULL,
           locked_at = NULL
       WHERE id = $1`,
      [jobId, sanitized]
    );
    logger.warn('Job permanently failed', { jobId, attempts });
    return 'dead';
  }

  const delay = backoffSeconds(attempts);
  await pool.query(
    `UPDATE background_jobs
     SET status = 'retrying',
         last_error = $2,
         available_at = now() + ($3 || ' seconds')::interval,
         updated_at = now(),
         locked_by = NULL,
         locked_at = NULL
     WHERE id = $1`,
    [jobId, sanitized, String(delay)]
  );
  logger.info('Job scheduled for retry', { jobId, attempts, delaySeconds: delay });
  return 'retrying';
}

export interface ReclaimStaleLocksResult {
  jobsReclaimed: number;
  feedbackReset: number;
  jobsEnsured: number;
}

/**
 * Recover jobs abandoned by crashed workers.
 * - background_jobs stuck in `processing` past the lock timeout → `queued` (retryable)
 * - linked feedback still in `analyzing` → `queued`
 * - orphan feedback rows stuck in `analyzing` past the same timeout → `queued`
 * - ensure each reset feedback has a claimable analyze job
 *
 * Safe to call from multiple workers (idempotent UPDATEs).
 */
export async function reclaimStaleLocks(
  pool: Pool,
  lockTimeoutSeconds: number
): Promise<ReclaimStaleLocksResult> {
  const timeoutSec = Math.max(60, Math.floor(lockTimeoutSeconds));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const jobsRes = await client.query<{ id: string; resource_id: string | null }>(
      `UPDATE background_jobs
       SET status = 'queued',
           locked_by = NULL,
           locked_at = NULL,
           available_at = now(),
           updated_at = now(),
           last_error = COALESCE(last_error, 'Reclaimed after stale worker lock')
       WHERE status = 'processing'
         AND locked_at IS NOT NULL
         AND locked_at < now() - make_interval(secs => $1)
       RETURNING id, resource_id`,
      [timeoutSec]
    );

    const resourceIds = new Set<string>();
    for (const row of jobsRes.rows) {
      if (row.resource_id) resourceIds.add(row.resource_id);
    }

    let feedbackReset = 0;

    if (resourceIds.size > 0) {
      const linked = await client.query<{ id: string }>(
        `UPDATE feedbacks
         SET processing_status = 'queued',
             status = 'queued',
             queued_at = now(),
             processing_error = COALESCE(processing_error, 'Recovered from stale worker lock')
         WHERE id = ANY($1::uuid[])
           AND deleted_at IS NULL
           AND processing_status = 'analyzing'
         RETURNING id`,
        [[...resourceIds]]
      );
      feedbackReset += linked.rowCount ?? linked.rows.length;
      for (const row of linked.rows) resourceIds.add(row.id);
    }

    // Orphan analyzing rows (job row missing / never linked) past the same timeout
    const orphans = await client.query<{ id: string; organization_id: string | null }>(
      `UPDATE feedbacks
       SET processing_status = 'queued',
           status = 'queued',
           queued_at = now(),
           processing_error = COALESCE(processing_error, 'Recovered from stale analyzing state')
       WHERE deleted_at IS NULL
         AND processing_status = 'analyzing'
         AND analyzing_at IS NOT NULL
         AND analyzing_at < now() - make_interval(secs => $1)
       RETURNING id, organization_id`,
      [timeoutSec]
    );
    feedbackReset += orphans.rowCount ?? orphans.rows.length;
    for (const row of orphans.rows) resourceIds.add(row.id);

    // Ensure every reset feedback has a claimable analyze job
    let jobsEnsured = 0;
    const resetIds = [...resourceIds];
    if (resetIds.length > 0) {
      // Revive latest terminal/stale job for each feedback when no active job exists
      const revived = await client.query(
        `UPDATE background_jobs bj
         SET status = 'queued',
             locked_by = NULL,
             locked_at = NULL,
             available_at = now(),
             completed_at = NULL,
             updated_at = now(),
             attempts = LEAST(bj.attempts, GREATEST(bj.max_attempts - 1, 0)),
             last_error = COALESCE(bj.last_error, 'Requeued after stale lock recovery')
         FROM (
           SELECT DISTINCT ON (resource_id) id, resource_id
           FROM background_jobs
           WHERE job_type = 'analyze_feedback'
             AND resource_id = ANY($1::uuid[])
             AND status NOT IN ('queued', 'retrying', 'processing')
           ORDER BY resource_id, created_at DESC
         ) latest
         WHERE bj.id = latest.id
           AND NOT EXISTS (
             SELECT 1 FROM background_jobs active
             WHERE active.job_type = 'analyze_feedback'
               AND active.resource_id = latest.resource_id
               AND active.status IN ('queued', 'retrying', 'processing')
           )
         RETURNING bj.id`,
        [resetIds]
      );
      jobsEnsured += revived.rowCount ?? revived.rows.length;

      // Insert missing jobs for feedback with no analyze_feedback row at all
      const inserted = await client.query(
        `INSERT INTO background_jobs
           (job_type, status, payload, organization_id, resource_type, resource_id, idempotency_key, max_attempts, available_at)
         SELECT
           'analyze_feedback',
           'queued',
           jsonb_build_object('feedbackId', f.id::text),
           f.organization_id,
           'feedback',
           f.id,
           'analyze:' || f.id::text || ':reclaim:' || extract(epoch from now())::bigint::text,
           5,
           now()
         FROM feedbacks f
         WHERE f.id = ANY($1::uuid[])
           AND f.deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM background_jobs bj
             WHERE bj.job_type = 'analyze_feedback'
               AND bj.resource_id = f.id
               AND bj.status IN ('queued', 'retrying', 'processing')
           )
         RETURNING id`,
        [resetIds]
      );
      jobsEnsured += inserted.rowCount ?? inserted.rows.length;
    }

    await client.query('COMMIT');

    const result: ReclaimStaleLocksResult = {
      jobsReclaimed: jobsRes.rowCount ?? jobsRes.rows.length,
      feedbackReset,
      jobsEnsured,
    };

    if (result.jobsReclaimed > 0 || result.feedbackReset > 0 || result.jobsEnsured > 0) {
      logger.warn('Reclaimed stale worker locks', {
        ...result,
        lockTimeoutSeconds: timeoutSec,
      });
    }

    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getQueueDepth(pool: Pool): Promise<{ queued: number; processing: number; dead: number }> {
  const result = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM background_jobs
     WHERE status IN ('queued', 'retrying', 'processing', 'dead')
     GROUP BY status`
  );
  const map: Record<string, number> = {};
  for (const row of result.rows) {
    map[row.status] = parseInt(row.count, 10);
  }
  return {
    queued: (map.queued || 0) + (map.retrying || 0),
    processing: map.processing || 0,
    dead: map.dead || 0,
  };
}

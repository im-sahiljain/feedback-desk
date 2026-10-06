import { randomUUID } from 'node:crypto';
import { getPool } from '../db.js';
import { getConfig } from '../config/env.js';
import { claimNextJob, completeJob, failJob, getQueueDepth, reclaimStaleLocks } from './queue.js';
import { classifyImpactSingle, ANALYSIS_VERSION, SCHEMA_VERSION, PROMPT_VERSION } from '../ai/classify.js';
import { sanitizeForAi } from '../ai/sanitize.js';
import { logger } from '../logging/logger.js';

export const JOB_ANALYZE_FEEDBACK = 'analyze_feedback';

/** How often idle workers attempt stale-lock reclaim (ms). */
const RECLAIM_POLL_INTERVAL_MS = 60_000;

let shuttingDown = false;
let activeWorkers = 0;
let lastReclaimAt = 0;
let reclaimInFlight: Promise<void> | null = null;

async function runStaleLockReclaim(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastReclaimAt < RECLAIM_POLL_INTERVAL_MS) {
    return;
  }
  if (reclaimInFlight) {
    await reclaimInFlight;
    return;
  }

  lastReclaimAt = now;
  const timeoutSeconds = getConfig().jobLockTimeoutSeconds;
  reclaimInFlight = (async () => {
    try {
      await reclaimStaleLocks(getPool(), timeoutSeconds);
    } catch (err) {
      logger.error('Stale lock reclaim failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      reclaimInFlight = null;
    }
  })();

  await reclaimInFlight;
}

export async function processAnalyzeFeedbackJob(job: {
  id: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  organization_id: string | null;
  resource_id: string | null;
  created_at: Date;
}): Promise<void> {
  const pool = getPool();
  const feedbackId = String(job.payload.feedbackId || job.resource_id || '');
  if (!feedbackId) {
    throw new Error('Missing feedbackId in job payload');
  }

  const fbRes = await pool.query<{
    id: string;
    feedback: string;
    product_id: string;
    organization_id: string | null;
    processing_status: string;
    analysis_version: string | null;
  }>(
    `SELECT id, feedback, product_id, organization_id, processing_status, analysis_version
     FROM feedbacks WHERE id = $1 AND deleted_at IS NULL`,
    [feedbackId]
  );

  if (fbRes.rows.length === 0) {
    logger.warn('Feedback missing for analysis job; completing', { jobId: job.id, feedbackId });
    await completeJob(pool, job.id);
    return;
  }

  const feedback = fbRes.rows[0];

  // Idempotent: already analyzed at current version
  if (feedback.processing_status === 'analyzed' && feedback.analysis_version === ANALYSIS_VERSION) {
    await completeJob(pool, job.id);
    return;
  }

  const queueWaitMs = Math.max(0, Date.now() - new Date(job.created_at).getTime());

  await pool.query(
    `UPDATE feedbacks
     SET processing_status = 'analyzing', analyzing_at = now(), status = 'analyzing'
     WHERE id = $1`,
    [feedbackId]
  );

  const labelsRes = await pool.query<{ settings: { categories?: string[] } }>(
    'SELECT settings FROM products WHERE id = $1',
    [feedback.product_id]
  );
  const customLabels = Array.isArray(labelsRes.rows[0]?.settings?.categories)
    ? labelsRes.rows[0].settings.categories!
    : [];

  const { sanitized } = sanitizeForAi(feedback.feedback);
  const started = Date.now();

  let analysis;
  let parseFailure = false;
  try {
    analysis = await classifyImpactSingle(feedback.feedback, customLabels);
  } catch (err) {
    parseFailure = true;
    throw err;
  }

  const latencyMs = Date.now() - started;

  await pool.query(
    `UPDATE feedbacks SET
       categories = $2::text[],
       category_name = $3::text,
       sentiment_label = $4::text,
       priority_label = $5::text,
       confidence = $6::text,
       raw_ai_metadata = $7::jsonb,
       sanitized_feedback = $8::text,
       processing_status = 'analyzed',
       status = 'analyzed',
       analyzed_at = now(),
       processed_at = now(),
       processing_latency_ms = $9::integer,
       analysis_version = $10::text,
       schema_version = $11::text,
       prompt_version = $12::text,
       model_provider = $13::text,
       model_name = $14::text,
       processing_error = NULL,
       analysis_failed_at = NULL
     WHERE id = $1::uuid`,
    [
      feedbackId,
      analysis.categories,
      analysis.category.label,
      analysis.sentiment.label,
      analysis.priority.label,
      String(analysis.category.confidence),
      JSON.stringify(analysis),
      sanitized,
      latencyMs,
      ANALYSIS_VERSION,
      SCHEMA_VERSION,
      PROMPT_VERSION,
      analysis.model_provider,
      analysis.model_name,
    ]
  );

  await pool.query(
    `INSERT INTO ai_processing_metrics
     (job_id, feedback_id, organization_id, provider, model_name, success, latency_ms, queue_wait_ms,
      retry_count, parse_failure, prompt_version, schema_version, analysis_version)
     VALUES ($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text,TRUE,$6::integer,$7::integer,$8::integer,$9::boolean,$10::text,$11::text,$12::text)`,
    [
      job.id,
      feedbackId,
      feedback.organization_id || job.organization_id,
      analysis.model_provider,
      analysis.model_name,
      latencyMs,
      queueWaitMs,
      Math.max(0, job.attempts - 1),
      parseFailure,
      PROMPT_VERSION,
      SCHEMA_VERSION,
      ANALYSIS_VERSION,
    ]
  );

  await completeJob(pool, job.id);
}

async function handleJobFailure(
  job: { id: string; attempts: number; max_attempts: number; resource_id: string | null; payload: Record<string, unknown>; organization_id: string | null },
  err: unknown
): Promise<void> {
  const pool = getPool();
  const message = err instanceof Error ? err.message : 'Unknown error';
  const outcome = await failJob(pool, job.id, message, job.attempts, job.max_attempts);

  const feedbackId = String(job.payload.feedbackId || job.resource_id || '');
  if (feedbackId) {
    const status = outcome === 'dead' ? 'analysis_failed' : 'queued';
    await pool.query(
      `UPDATE feedbacks SET
         processing_status = $2::text,
         status = $2::text,
         processing_error = $3::text,
         analysis_failed_at = CASE WHEN $2::text = 'analysis_failed' THEN now() ELSE analysis_failed_at END,
         queued_at = CASE WHEN $2::text = 'queued' THEN now() ELSE queued_at END
       WHERE id = $1::uuid`,
      [feedbackId, status, message.slice(0, 500)]
    );
  }

  await pool.query(
    `INSERT INTO ai_processing_metrics
     (job_id, feedback_id, organization_id, provider, model_name, success, retry_count, parse_failure, error_code,
      prompt_version, schema_version, analysis_version)
     VALUES ($1::uuid,$2::uuid,$3::uuid,'google',$4::text,FALSE,$5::integer,TRUE,$6::text,$7::text,$8::text,$9::text)`,
    [
      job.id,
      feedbackId || null,
      job.organization_id,
      MODEL_PLACEHOLDER,
      Math.max(0, job.attempts - 1),
      'analysis_error',
      PROMPT_VERSION,
      SCHEMA_VERSION,
      ANALYSIS_VERSION,
    ]
  );
}

const MODEL_PLACEHOLDER = 'gemini-3.5-flash-lite';

async function workerLoop(workerId: string): Promise<void> {
  const pool = getPool();
  while (!shuttingDown) {
    try {
      // Reclaim abandoned locks before claiming — especially important after restarts
      await runStaleLockReclaim(false);

      const job = await claimNextJob(pool, workerId, [JOB_ANALYZE_FEEDBACK]);
      if (!job) {
        await sleep(1500);
        continue;
      }

      activeWorkers++;
      try {
        if (job.job_type === JOB_ANALYZE_FEEDBACK) {
          await processAnalyzeFeedbackJob(job);
        } else {
          await completeJob(pool, job.id);
        }
      } catch (err) {
        await handleJobFailure(job, err);
      } finally {
        activeWorkers--;
      }
    } catch (err) {
      logger.error('Worker loop error', {
        error: err instanceof Error ? err.message : 'unknown',
      });
      await sleep(2000);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function startWorkers(): () => Promise<void> {
  const concurrency = getConfig().workerConcurrency;
  const ids = Array.from({ length: concurrency }, () => `worker-${randomUUID().slice(0, 8)}`);
  logger.info('Starting background workers', {
    concurrency,
    jobLockTimeoutSeconds: getConfig().jobLockTimeoutSeconds,
  });

  // Immediate reclaim so crashed locks from a prior process are recoverable ASAP
  void runStaleLockReclaim(true);

  for (const id of ids) {
    void workerLoop(id);
  }

  return async () => {
    shuttingDown = true;
    logger.info('Worker graceful shutdown initiated');
    const deadline = Date.now() + 15000;
    while (activeWorkers > 0 && Date.now() < deadline) {
      await sleep(200);
    }
    const depth = await getQueueDepth(getPool());
    logger.info('Workers stopped', { queueDepth: depth, activeWorkers });
  };
}

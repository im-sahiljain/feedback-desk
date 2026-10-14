import { NextRequest, NextResponse } from 'next/server';
import { getBffTokens } from '@/lib/bffAuth';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await getBffTokens();
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Detailed Queue Counts across all lifecycle statuses
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
        COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'retrying')::int AS retrying,
        COUNT(*) FILTER (WHERE status = 'dead')::int AS dead,
        COUNT(*)::int AS total
      FROM background_jobs
    `);
    const stats = statsRes.rows[0] || {};

    const queued = Number(stats.queued) || 0;
    const processing = Number(stats.processing) || 0;
    const completed = Number(stats.completed) || 0;
    const retrying = Number(stats.retrying) || 0;
    const dead = Number(stats.dead) || 0;
    const total = Number(stats.total) || 0;

    // 2. Fetch the 50 most relevant jobs (prioritizing in-flight, dead, retrying, then recently updated)
    const jobsRes = await pool.query(`
      SELECT
        j.id,
        j.job_type,
        j.status,
        j.attempts,
        j.max_attempts,
        j.last_error,
        j.available_at,
        j.created_at,
        j.updated_at,
        j.locked_at,
        j.locked_by,
        j.payload,
        f.id AS feedback_id,
        f.feedback AS feedback_text,
        f.rating,
        f.category_name,
        f.sentiment_label,
        f.priority_label,
        p.name AS product_name
      FROM background_jobs j
      LEFT JOIN feedbacks f ON f.id::text = COALESCE(j.resource_id::text, j.payload->>'feedbackId')
      LEFT JOIN products p ON p.id::text = f.product_id::text
      ORDER BY
        CASE WHEN j.status = 'processing' THEN 1
             WHEN j.status = 'retrying' THEN 2
             WHEN j.status = 'dead' THEN 3
             WHEN j.status = 'queued' THEN 4
             ELSE 5 END,
        j.updated_at DESC
      LIMIT 60
    `);

    // 3. Query recent AI inference latency to calculate accurate pacing and drain times
    let avgLatencyMs = 2100;
    try {
      const latencyRes = await pool.query(`
        SELECT COALESCE(ROUND(AVG(latency_ms)), 2100)::int AS avg_latency_ms
        FROM (
          SELECT latency_ms FROM ai_processing_metrics
          WHERE success = TRUE
          ORDER BY created_at DESC
          LIMIT 25
        ) sub
      `);
      avgLatencyMs = Number(latencyRes.rows[0]?.avg_latency_ms) || 2100;
    } catch {
      // fallback if table has no entries yet
    }

    const interJobDelayMs = 4500;
    const cycleMs = interJobDelayMs + avgLatencyMs;
    const effectiveRpm = Number((60000 / cycleMs).toFixed(1));
    const estimatedSecondsRemaining = queued > 0 ? Math.round((queued * cycleMs) / 1000) : 0;

    const formatDuration = (totalSec: number) => {
      if (totalSec <= 0) return '0s (Queue empty)';
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      if (mins === 0) return `${secs}s`;
      return `${mins}m ${secs}s`;
    };

    return NextResponse.json({
      status: dead > 0 ? 'degraded' : 'healthy',
      queue: {
        queued,
        processing,
        analyzing: processing,
        completed,
        failed: retrying,
        retrying,
        dead,
        total,
      },
      concurrency: Number(process.env.WORKER_CONCURRENCY || 1),
      workerHealth: processing > 0 || queued > 0 ? 'active' : 'idle',
      pacing: {
        interJobDelayMs,
        interJobDelaySeconds: interJobDelayMs / 1000,
        avgLatencyMs,
        avgLatencySeconds: Number((avgLatencyMs / 1000).toFixed(2)),
        cycleMsPerJob: cycleMs,
        cycleSecondsPerJob: Number((cycleMs / 1000).toFixed(1)),
        rpmLimit: 15,
        effectiveRpm,
        estimatedSecondsRemaining,
        estimatedTimeFormatted: formatDuration(estimatedSecondsRemaining),
        tier: 'Gemini Free Tier (15 RPM max)',
      },
      jobs: jobsRes.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Admin Queue GET Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to fetch queue metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/queue
 * Replay dead-letter jobs or specific job without disturbing the active worker.
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await getBffTokens();
    if (!accessToken && !refreshToken) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const pool = getDbPool();
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const jobId = body?.jobId;

    if (jobId) {
      // Replay a single specific job
      const jobRes = await pool.query(
        `UPDATE background_jobs
         SET status = 'queued',
             attempts = 0,
             last_error = NULL,
             available_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, resource_id, payload`,
        [jobId]
      );

      if (jobRes.rows.length === 0) {
        return NextResponse.json({ message: 'Job not found' }, { status: 404 });
      }

      const row = jobRes.rows[0];
      const fbId = row.resource_id || row.payload?.feedbackId;
      if (fbId) {
        await pool.query(
          `UPDATE feedbacks
           SET processing_status = 'queued',
               status = 'received',
               processing_error = NULL,
               analysis_failed_at = NULL
            WHERE id::text = $1::text`,
          [String(fbId)]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Job successfully re-queued for processing.',
        replayedCount: 1,
      });
    }

    // Default: Replay ALL dead letter jobs
    const deadRes = await pool.query(
      `SELECT id, resource_id, payload FROM background_jobs WHERE status = 'dead'`
    );

    if (deadRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No dead letter jobs to replay.',
        replayedCount: 0,
      });
    }

    const feedbackIds = deadRes.rows
      .map((r) => String(r.resource_id || r.payload?.feedbackId || ''))
      .filter(Boolean);

    await pool.query(`
      UPDATE background_jobs
      SET status = 'queued',
          attempts = 0,
          last_error = NULL,
          available_at = NOW(),
          updated_at = NOW()
      WHERE status = 'dead'
    `);

    if (feedbackIds.length > 0) {
      await pool.query(
        `UPDATE feedbacks
         SET processing_status = 'queued',
             status = 'received',
             processing_error = NULL,
             analysis_failed_at = NULL
         WHERE id::text = ANY($1::text[]) AND processing_status = 'analysis_failed'`,
        [feedbackIds]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully re-queued ${deadRes.rows.length} dead letter jobs for AI processing.`,
      replayedCount: deadRes.rows.length,
    });
  } catch (error: any) {
    console.error('Admin Queue POST Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to replay dead letter jobs' },
      { status: 500 }
    );
  }
}

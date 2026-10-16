import { getPool } from '../db.js';
import { logger } from '../logging/logger.js';

export type AiOperationType = 'classification' | 'chat' | 'embedding' | 'clustering_verification';

export interface AiMetricInput {
  productId?: string | null;
  userId?: string | null;
  operationType: AiOperationType;
  provider?: string;
  modelName: string;
  tokenInput?: number;
  tokenOutput?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  success: boolean;
  errorCode?: string | null;
  jobId?: string | null;
  feedbackId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Calculates estimated USD cost based on official Google Gemini rates.
 * - Gemini 3.5 Flash Lite: $0.075 per 1M prompt tokens, $0.30 per 1M candidate tokens.
 * - Gemini 3.5 Flash: $0.15 per 1M prompt tokens, $0.60 per 1M candidate tokens.
 * - Text/Gemini Embedding 001/004: $0.02 per 1M input tokens.
 */
export function calculateAiCost(model: string, tokenInput = 0, tokenOutput = 0): number {
  const norm = (model || '').toLowerCase();
  let cost = 0;

  if (norm.includes('flash-lite')) {
    cost = (tokenInput / 1_000_000) * 0.075 + (tokenOutput / 1_000_000) * 0.3;
  } else if (norm.includes('flash')) {
    cost = (tokenInput / 1_000_000) * 0.15 + (tokenOutput / 1_000_000) * 0.6;
  } else if (norm.includes('embedding')) {
    cost = (tokenInput / 1_000_000) * 0.02;
  } else {
    // Default fallback calculation
    cost = (tokenInput / 1_000_000) * 0.075 + (tokenOutput / 1_000_000) * 0.3;
  }

  return Number(cost.toFixed(6));
}

/**
 * Asynchronously logs AI telemetry into ai_processing_metrics.
 * Execution is fire-and-forget so user latency is never impacted.
 */
export async function recordAiMetric(input: AiMetricInput): Promise<void> {
  const pool = getPool();
  const tokenIn = Math.max(0, input.tokenInput || 0);
  const tokenOut = Math.max(0, input.tokenOutput || 0);
  const costUsd =
    input.estimatedCostUsd !== undefined
      ? input.estimatedCostUsd
      : calculateAiCost(input.modelName, tokenIn, tokenOut);

  // Non-blocking write to avoid adding database overhead to critical user path
  setImmediate(async () => {
    try {
      await pool.query(
        `INSERT INTO ai_processing_metrics (
          product_id,
          user_id,
          operation_type,
          provider,
          model_name,
          success,
          latency_ms,
          token_input,
          token_output,
          estimated_cost_usd,
          error_code,
          job_id,
          feedback_id,
          metadata
        ) VALUES (
          $1::uuid,
          $2::uuid,
          $3::varchar,
          $4::text,
          $5::text,
          $6::boolean,
          $7::integer,
          $8::integer,
          $9::integer,
          $10::numeric,
          $11::text,
          $12::uuid,
          $13::uuid,
          $14::jsonb
        )`,
        [
          input.productId || null,
          input.userId || null,
          input.operationType,
          input.provider || 'google',
          input.modelName,
          input.success,
          input.latencyMs || 0,
          tokenIn,
          tokenOut,
          costUsd,
          input.errorCode || null,
          input.jobId || null,
          input.feedbackId || null,
          JSON.stringify(input.metadata || {}),
        ],
      );
    } catch (err) {
      logger.warn('Failed to record AI telemetry metric', {
        operation: input.operationType,
        model: input.modelName,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  });
}

import { GoogleGenAI, Type } from "@google/genai";
import { Pool } from "pg";

import { formatFriendlyDate } from "./dates.js";

/**
 * Executive Customer Feedback Intelligence
 *
 * Product principle:
 *
 *   Feedback
 *      ↓
 *   Structured feedback understanding
 *      ↓
 *   Observed customer signals
 *      ↓
 *   Reported issues / praise / requests
 *      ↓
 *   Evidence strength
 *      ↓
 *   Root-cause hypotheses only when supported
 *      ↓
 *   Evidence-backed recommended actions
 *
 * This module must NEVER convert correlation into causation.
 * It must NEVER invent ROI, churn reduction, revenue impact,
 * internal system failures, or operational causes.
 */

/* ============================================================
 * TYPES
 * ============================================================ */

export type AttentionStatus =
  | "Critical Alert"
  | "Action Required"
  | "Needs Attention"
  | "Stable"
  | "Healthy";

export type QualitativeConfidence = "low" | "medium" | "high";

export type EvidenceStrength = "limited" | "moderate" | "strong";

export type RecommendationUrgency = "Immediate" | "Soon" | "Monitor";

export interface CategoryCorrelation {
  category: string;
  total_count: number;
  neg_count: number;
  pos_count: number;
  high_priority_count: number;

  /**
   * Percentage of ALL negative feedback records in the period
   * that include this category.
   *
   * This is an observed concentration, NOT business impact.
   */
  neg_share_percent: number;

  /**
   * Percentage of ALL high-priority feedback records in the
   * period that include this category.
   */
  high_priority_share_percent: number;
}

export interface EvidenceReference {
  feedback_id: string;
  excerpt?: string;
}

export interface KeyFinding {
  finding: string;

  type:
    | "negative_signal"
    | "positive_signal"
    | "feature_request"
    | "risk_signal"
    | "mixed_signal"
    | "operational_signal";

  /**
   * Number of supporting feedback records represented by
   * evidence_feedback_ids.
   *
   * This must not be interpreted as total population frequency
   * unless the finding explicitly came from full-period SQL metrics.
   */
  evidence_count: number;

  evidence_feedback_ids: string[];

  /**
   * True when count is based on full-period deterministic aggregation.
   * False when based only on representative evidence samples.
   */
  full_period_count: boolean;
}

export interface ReportedIssue {
  issue: string;
  topic: string | null;

  severity: "low" | "medium" | "high" | "critical" | null;

  /**
   * How many reviewed evidence records support this issue.
   *
   * Until a proper persistent issue-clustering layer exists,
   * do NOT present this as exact global issue frequency unless
   * full_period_count is true.
   */
  evidence_count: number;

  evidence_feedback_ids: string[];

  full_period_count: boolean;
}

export interface RootCauseHypothesis {
  hypothesis: string;
  confidence: QualitativeConfidence;
  evidence_feedback_ids: string[];
}

export interface RecommendedAction {
  rank: number;

  title: string;

  area: string;

  urgency: RecommendationUrgency;

  action: string;

  /**
   * Why the recommendation exists.
   * Must reference actual observed customer evidence.
   */
  reason: string;

  /**
   * Qualitative effect only.
   *
   * Examples:
   * - "Addresses the most common currently observed negative signal."
   * - "Helps investigate a repeated customer-reported problem."
   *
   * NEVER:
   * - "Reduces churn by 20%"
   * - "Eliminates 75% of friction"
   */
  expected_effect: string | null;

  evidence_feedback_ids: string[];
}

export interface StrengthSignal {
  strength: string;
  evidence_count: number;
  evidence_feedback_ids: string[];
}

export interface DataContext {
  total_feedback: number;
  positive: number;
  negative: number;
  neutral: number;
  mixed: number;

  high_priority: number;
  medium_priority: number;
  low_priority: number;

  average_rating: number | null;

  evidence_strength: EvidenceStrength;

  /**
   * Human-readable qualification for business users.
   */
  evidence_note: string;
}

export interface ChartSnapshot {
  sentiment: Array<{ name: string; value: number }>;

  priority: Array<{ name: string; value: number }>;

  trend: Array<{
    bucket: string;
    label: string;
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  }>;

  /**
   * These are individual important feedback records.
   * They are NOT issue clusters.
   */
  priority_feedback: Array<{
    feedback_id: string;
    text: string;
    category: string;
    rating: number | null;
    sentiment: string;
    priority: string;
  }>;

  /**
   * Deprecated compatibility alias for older frontend code.
   *
   * Remove after frontend is migrated to priority_feedback.
   */
  top_issues?: Array<{
    text: string;
    category: string;
    rating: number | null;
  }>;
}

export interface ImpactCorrelationMetrics {
  total_feedback: number;
  total_negative: number;
  total_positive: number;
  total_neutral: number;
  total_mixed: number;

  total_high_priority: number;
  total_medium_priority: number;
  total_low_priority: number;

  average_rating: number | null;

  /**
   * Neutral terminology.
   */
  leading_negative_category: string | null;
  leading_negative_category_neg_share: number;
  leading_negative_category_high_priority_share: number;

  /**
   * Deterministic evidence statement.
   * Never causal.
   */
  observed_signal_statement: string;

  categories: CategoryCorrelation[];

  period_key: string;
  period_label: string;

  chart_snapshot?: ChartSnapshot;

  /**
   * =========================================================
   * DEPRECATED COMPATIBILITY FIELDS
   * =========================================================
   *
   * Keep temporarily so old frontend/API consumers do not break.
   *
   * Their values are populated using neutral evidence semantics.
   */
  primary_culprit_category?: string;
  primary_culprit_neg_share?: number;
  primary_culprit_high_priority_share?: number;
  quantified_impact_statement?: string;
}

export interface StrategicDecision {
  rank: number;
  title: string;
  department_or_area: string;

  /**
   * Legacy UI value.
   */
  urgency:
    | "Immediate (24-48h)"
    | "Short-Term (1-2 Weeks)"
    | "Strategic / Policy";

  decision: string;

  /**
   * Deprecated legacy name.
   *
   * Contains ONLY qualitative expected effect.
   * Never numerical ROI.
   */
  expected_roi_or_impact: string;
}

export interface ExecutiveBrief {
  headline: string;

  /**
   * New preferred field.
   */
  attention_status: AttentionStatus;

  /**
   * Legacy alias for current UI.
   */
  macro_health_status: AttentionStatus;

  executive_summary: string;

  data_context: DataContext;

  key_findings: KeyFinding[];

  reported_issues: ReportedIssue[];

  root_cause_hypotheses: RootCauseHypothesis[];

  recommended_actions: RecommendedAction[];

  strengths: StrengthSignal[];

  period_key: string;
  period_label: string;

  generated_at: string;
  is_cached: boolean;

  window_start?: string | null;
  window_end?: string | null;

  is_stale?: boolean;

  /**
   * =========================================================
   * DEPRECATED COMPATIBILITY FIELDS
   * =========================================================
   */

  impact_correlation: {
    /**
     * Legacy frontend name.
     *
     * This is now only the leading negative CATEGORY.
     * It is not a root cause or "culprit."
     */
    primary_culprit_category: string;

    /**
     * Neutral observed-data statement.
     */
    quantified_impact_statement: string;

    /**
     * Compatibility text generated from hypotheses.
     */
    root_cause_diagnosis: string;
  };

  top_strategic_decisions: StrategicDecision[];

  strengths_to_reinforce: string[];
}

interface FeedbackContext {
  id: string;

  feedback: string;

  safe_feedback_excerpt: string;

  rating: number | null;

  sentiment_label: string;

  priority_label: string;

  categories: string[];

  summary: string | null;

  intents: string[];

  topics: string[];

  issues: Array<{
    issue: string;
    topic: string | null;
    severity: string | null;
    urgency: string | null;
    evidence: string[];
  }>;

  requested_capabilities: string[];

  positive_attributes: string[];

  root_cause_hypotheses: Array<{
    hypothesis: string;
    confidence: QualitativeConfidence;
    evidence: string[];
  }>;

  action_items: string[];

  created_at: string;
}

/* ============================================================
 * SAFETY HELPERS
 * ============================================================ */

/**
 * This remains defense-in-depth only.
 *
 * The model/schema should already prevent fabricated quantitative
 * impact. Do not rely on regex sanitization as the primary safety
 * mechanism.
 */
export function sanitizeImpactClaim(text: string): string {
  if (!text) {
    return "Expected effect is qualitative and cannot be quantified from feedback alone.";
  }

  let out = String(text);

  const suspiciousPatterns: RegExp[] = [
    /reduces?\s+churn\s+by\s+~?\d+(\.\d+)?%/gi,
    /increase[sd]?\s+revenue\s+by\s+~?\d+(\.\d+)?%/gi,
    /save[sd]?\s+~?\d+(\.\d+)?%/gi,
    /ROI\s+(of\s+)?~?\d+(\.\d+)?%/gi,
    /estimated\s+ROI[^.]*\./gi,
    /eliminates?\s+(up\s+to\s+)?\d+(\.\d+)?%\s+[^.]*\.?/gi,
    /will\s+(increase|reduce|save|improve|eliminate)\s+[^.]*\d+%[^.]*\.?/gi,
    /prevent[s]?\s+churn[^.]*\.?/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    out = out.replace(
      pattern,
      "Expected effect cannot be quantitatively established from feedback alone.",
    );
  }

  return out.trim();
}

/**
 * Generic evidence-grounding helpers.
 *
 * These deliberately avoid domain-specific blacklists. The goal is not to ban
 * words such as "database", "insurance", "staffing", or "delivery". Any of
 * those concepts may be valid when the source evidence actually supports them.
 *
 * Instead, executive synthesis is allowed to keep a hypothesis only when its
 * substantive concepts are grounded in the linked feedback text.
 */
const GROUNDING_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "been",
  "before",
  "being",
  "between",
  "could",
  "customer",
  "customers",
  "feedback",
  "from",
  "have",
  "having",
  "into",
  "issue",
  "likely",
  "might",
  "more",
  "possible",
  "possibly",
  "problem",
  "related",
  "reported",
  "seems",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "through",
  "under",
  "using",
  "with",
  "would",
]);

function normalizeGroundingToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ingly|edly|ing|ed|es|s)$/i, "")
    .trim();
}

function extractGroundingTokens(text: string): Set<string> {
  const tokens = String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map(normalizeGroundingToken)
    .filter(
      (token) =>
        token.length >= 4 &&
        !GROUNDING_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token),
    );

  return new Set(tokens);
}

function tokenIsGrounded(token: string, evidenceTokens: Set<string>): boolean {
  if (evidenceTokens.has(token)) return true;

  for (const evidenceToken of evidenceTokens) {
    if (
      token.length >= 5 &&
      evidenceToken.length >= 5 &&
      (token.startsWith(evidenceToken) || evidenceToken.startsWith(token))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Conservative lexical entailment check used only as a backend safety net.
 *
 * Semantic validity is primarily established by the model prompt + evidence IDs.
 * This check rejects hypotheses that are effectively disconnected from the
 * supporting feedback. It intentionally does not try to prove causality itself.
 */
function isEvidenceGroundedHypothesis(
  hypothesis: string,
  evidenceText: string,
): boolean {
  const hypothesisTokens = extractGroundingTokens(hypothesis);
  const evidenceTokens = extractGroundingTokens(evidenceText);

  if (hypothesisTokens.size === 0 || evidenceTokens.size === 0) {
    return false;
  }

  const substantiveTokens = Array.from(hypothesisTokens);
  const groundedCount = substantiveTokens.filter((token) =>
    tokenIsGrounded(token, evidenceTokens),
  ).length;

  // Require at least one real anchor and increasing support for longer claims.
  const minimumAnchors = substantiveTokens.length >= 8 ? 2 : 1;
  if (groundedCount < minimumAnchors) return false;

  // For short hypotheses one anchor is enough; for longer explanations require
  // a modest share of their substantive vocabulary to be traceable to evidence.
  if (substantiveTokens.length <= 4) return true;

  return groundedCount / substantiveTokens.length >= 0.2;
}

function sanitizeExpectedEffect(
  text: string | null | undefined,
): string | null {
  if (!text) return null;

  const sanitized = sanitizeImpactClaim(text);

  // Predictive/certain business outcomes are not supported by feedback alone.
  if (
    /(prevent|guarantee|eliminate|protect|increase|decrease|reduce|improve|enhance|ensure|resolve.*quickly|avoid churn|retain customers)/i.test(
      sanitized,
    )
  ) {
    return "Addresses the customer-reported concern described in the supporting evidence; the resulting business outcome is not yet measurable.";
  }

  return sanitized;
}

/**
 * Basic self-contained PII minimization for executive synthesis.
 *
 * The original feedback remains untouched in the DB.
 * Only the text sent into the executive synthesis prompt is minimized.
 *
 * If your repository already has a stronger shared sanitizeForAi()
 * utility, replace this with that shared function.
 */
function minimizeFeedbackForAi(input: string): string {
  if (!input) return "";

  return String(input)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[PHONE]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[PAYMENT_NUMBER]")
    .replace(
      /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,
      "[REDACTED_SECRET]",
    )
    .trim();
}

function truncateText(input: unknown, max = 500): string {
  const value = String(input ?? "").trim();

  if (value.length <= max) return value;

  return `${value.slice(0, max - 1)}…`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();

      if (
        item &&
        typeof item === "object" &&
        "name" in item &&
        typeof (item as any).name === "string"
      ) {
        return (item as any).name.trim();
      }

      return "";
    })
    .filter(Boolean);
}

function normalizeConfidence(value: unknown): QualitativeConfidence {
  const clean = String(value || "").toLowerCase();

  if (clean === "high") return "high";
  if (clean === "medium") return "medium";

  return "low";
}

function normalizeSeverity(
  value: unknown,
): "low" | "medium" | "high" | "critical" | null {
  const clean = String(value || "").toLowerCase();

  if (clean.includes("critical")) return "critical";
  if (clean.includes("high")) return "high";
  if (clean.includes("medium")) return "medium";
  if (clean.includes("low")) return "low";

  return null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function pickFirstArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

/* ============================================================
 * METADATA NORMALIZATION
 * ============================================================ */

function normalizeIssues(metadata: any): FeedbackContext["issues"] {
  const source = pickFirstArray(
    metadata?.issues,
    metadata?.analysis?.issues,
    metadata?.feedbackAnalysis?.issues,
    metadata?.customerFeedbackAnalysis?.issues,
  );

  return source
    .map((item: any) => {
      if (typeof item === "string") {
        return {
          issue: item.trim(),
          topic: null,
          severity: null,
          urgency: null,
          evidence: [],
        };
      }

      if (!item || typeof item !== "object") return null;

      const issue = String(
        item.issue || item.title || item.name || item.observation || "",
      ).trim();

      if (!issue) return null;

      const evidence = normalizeStringArray(
        item.evidence || item.evidenceSnippets || item.supportingEvidence || [],
      );

      return {
        issue,
        topic: item.topic
          ? String(item.topic).trim()
          : item.aspect
            ? String(item.aspect).trim()
            : null,

        severity: normalizeSeverity(item.severity),

        urgency: item.urgency ? String(item.urgency).toLowerCase() : null,

        evidence,
      };
    })
    .filter(Boolean) as FeedbackContext["issues"];
}

function normalizeRootCauseHypotheses(
  metadata: any,
): FeedbackContext["root_cause_hypotheses"] {
  const source = pickFirstArray(
    metadata?.rootCauseHypotheses,
    metadata?.root_cause_hypotheses,
    metadata?.analysis?.rootCauseHypotheses,
    metadata?.analysis?.root_cause_hypotheses,
  );

  return source
    .map((item: any) => {
      if (!item) return null;

      if (typeof item === "string") {
        return {
          hypothesis: item.trim(),
          confidence: "low" as QualitativeConfidence,
          evidence: [],
        };
      }

      const hypothesis = String(
        item.hypothesis || item.text || item.rootCause || "",
      ).trim();

      if (!hypothesis) return null;

      const evidence = normalizeStringArray(item.evidence || []);

      // Preserve structured per-feedback hypotheses here. Executive-level
      // validation later checks them against the actual linked feedback text.
      return {
        hypothesis,
        confidence: normalizeConfidence(item.confidence),
        evidence,
      };
    })
    .filter(Boolean) as FeedbackContext["root_cause_hypotheses"];
}

function normalizeFeedbackMetadata(row: any): FeedbackContext {
  const metadata =
    row.raw_ai_metadata && typeof row.raw_ai_metadata === "object"
      ? row.raw_ai_metadata
      : {};

  const analysis =
    metadata.analysis && typeof metadata.analysis === "object"
      ? metadata.analysis
      : metadata;

  const feedback = String(row.feedback || "");

  return {
    id: String(row.id),

    feedback,

    safe_feedback_excerpt: truncateText(minimizeFeedbackForAi(feedback), 500),

    rating:
      row.rating !== null &&
      row.rating !== undefined &&
      !Number.isNaN(Number(row.rating))
        ? Number(row.rating)
        : null,

    sentiment_label: String(row.sentiment_label || "Neutral"),

    priority_label: String(row.priority_label || "Low Priority"),

    categories: Array.isArray(row.categories)
      ? row.categories.map(String)
      : row.category_name
        ? [String(row.category_name)]
        : [],

    summary:
      metadata.summary ||
      analysis.executiveSummary ||
      analysis.executive_summary ||
      null,

    intents: uniqueStrings([
      ...normalizeStringArray(metadata.intents),
      ...normalizeStringArray(analysis.intents),
    ]),

    topics: uniqueStrings([
      ...normalizeStringArray(metadata.topics),
      ...normalizeStringArray(analysis.topics),
    ]),

    issues: normalizeIssues(metadata),

    requested_capabilities: uniqueStrings([
      ...normalizeStringArray(metadata.requestedCapabilities),
      ...normalizeStringArray(metadata.requested_capabilities),
      ...normalizeStringArray(analysis.requestedCapabilities),
      ...normalizeStringArray(analysis.requested_capabilities),
    ]),

    positive_attributes: uniqueStrings([
      ...normalizeStringArray(metadata.positiveAttributes),
      ...normalizeStringArray(metadata.positive_attributes),
      ...normalizeStringArray(analysis.positiveAttributes),
      ...normalizeStringArray(analysis.positive_attributes),
    ]),

    root_cause_hypotheses: normalizeRootCauseHypotheses(metadata),

    action_items: uniqueStrings([
      ...normalizeStringArray(metadata.actionItems),
      ...normalizeStringArray(metadata.action_items),
      ...normalizeStringArray(analysis.actionItems),
      ...normalizeStringArray(analysis.action_items),
    ]),

    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

/* ============================================================
 * PERIOD HANDLING
 * ============================================================ */

export function parsePeriodBounds(
  period: string = "all",
  customStart?: string,
  customEnd?: string,
): {
  periodKey: string;
  startDate: Date | null;
  endDate: Date | null;
  periodLabel: string;
} {
  const now = new Date();
  const cleanPeriod = (period || "all").toLowerCase();

  switch (cleanPeriod) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      return {
        periodKey: "today",
        startDate: start,
        endDate: now,
        periodLabel: "Today",
      };
    }

    case "7d": {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      return {
        periodKey: "7d",
        startDate: start,
        endDate: now,
        periodLabel: "Last 7 Days",
      };
    }

    case "30d": {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return {
        periodKey: "30d",
        startDate: start,
        endDate: now,
        periodLabel: "Last 30 Days",
      };
    }

    case "90d": {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      return {
        periodKey: "90d",
        startDate: start,
        endDate: now,
        periodLabel: "Last 90 Days (Quarter)",
      };
    }

    case "custom": {
      const start = customStart ? new Date(customStart) : null;

      const end = customEnd ? new Date(customEnd) : now;

      const key =
        `custom_${start?.toISOString().split("T")[0] || "start"}_` +
        `${end?.toISOString().split("T")[0] || "now"}`;

      const label =
        start && end
          ? `Custom Range (${formatFriendlyDate(start)} - ${formatFriendlyDate(end)})`
          : "Custom Date Range";

      return {
        periodKey: key,
        startDate: start,
        endDate: end,
        periodLabel: label,
      };
    }

    case "all":
    default:
      return {
        periodKey: "all",
        startDate: null,
        endDate: null,
        periodLabel: "All Time",
      };
  }
}

/* ============================================================
 * DETERMINISTIC METRICS
 * ============================================================ */

/**
 * Legacy exported name retained for compatibility.
 *
 * This function now calculates OBSERVED CUSTOMER SIGNALS,
 * not causal "impact correlation."
 */
export async function calculateImpactCorrelation(
  productId: string,
  pool: Pool,
  startDate: Date | null = null,
  endDate: Date | null = null,
  periodKey: string = "all",
  periodLabel: string = "All Time",
): Promise<ImpactCorrelationMetrics> {
  const overallRes = await pool.query(
    `
        SELECT
            COUNT(*) AS total,

            COUNT(*) FILTER (
                WHERE sentiment_label ILIKE 'negative'
            ) AS total_negative,

            COUNT(*) FILTER (
                WHERE sentiment_label ILIKE 'positive'
            ) AS total_positive,

            COUNT(*) FILTER (
                WHERE sentiment_label ILIKE 'neutral'
            ) AS total_neutral,

            COUNT(*) FILTER (
                WHERE sentiment_label ILIKE 'mixed'
            ) AS total_mixed,

            COUNT(*) FILTER (
                WHERE
                    priority_label ILIKE '%high%'
                    OR priority_label ILIKE '%critical%'
            ) AS total_high_priority,

            COUNT(*) FILTER (
                WHERE priority_label ILIKE '%medium%'
            ) AS total_medium_priority,

            COUNT(*) FILTER (
                WHERE priority_label ILIKE '%low%'
            ) AS total_low_priority,

            AVG(
                CASE
                    WHEN rating IS NULL THEN NULL
                    WHEN TRIM(rating::text) = '' THEN NULL
                    WHEN rating::text ~ '^[0-9]+(\\.[0-9]+)?$'
                        THEN rating::text::numeric
                    ELSE NULL
                END
            ) AS avg_rating

        FROM feedbacks

        WHERE product_id = $1
          AND deleted_at IS NULL
          AND (
              $2::timestamptz IS NULL
              OR created_at >= $2::timestamptz
          )
          AND (
              $3::timestamptz IS NULL
              OR created_at <= $3::timestamptz
          )
        `,
    [productId, startDate, endDate],
  );

  const overall = overallRes.rows[0];

  const totalFeedback = parseInt(overall.total, 10) || 0;

  const totalNegative = parseInt(overall.total_negative, 10) || 0;

  const totalPositive = parseInt(overall.total_positive, 10) || 0;

  const totalNeutral = parseInt(overall.total_neutral, 10) || 0;

  const totalMixed = parseInt(overall.total_mixed, 10) || 0;

  const totalHighPriority = parseInt(overall.total_high_priority, 10) || 0;

  const totalMediumPriority = parseInt(overall.total_medium_priority, 10) || 0;

  const totalLowPriority = parseInt(overall.total_low_priority, 10) || 0;

  const averageRating =
    overall.avg_rating !== null && overall.avg_rating !== undefined
      ? Number(overall.avg_rating)
      : null;

  /**
   * Multi-label category aggregation.
   *
   * A feedback can therefore appear in multiple categories.
   */
  const categoryRes = await pool.query(
    `
        SELECT
            cat,

            COUNT(*) AS total_count,

            COUNT(*) FILTER (
                WHERE sentiment_label ILIKE 'negative'
            ) AS neg_count,

            COUNT(*) FILTER (
                WHERE sentiment_label ILIKE 'positive'
            ) AS pos_count,

            COUNT(*) FILTER (
                WHERE
                    priority_label ILIKE '%high%'
                    OR priority_label ILIKE '%critical%'
            ) AS high_priority_count

        FROM (
            SELECT
                unnest(
                    COALESCE(
                        categories,
                        ARRAY[category_name]
                    )
                ) AS cat,

                sentiment_label,
                priority_label

            FROM feedbacks

            WHERE product_id = $1
              AND deleted_at IS NULL
              AND (
                  $2::timestamptz IS NULL
                  OR created_at >= $2::timestamptz
              )
              AND (
                  $3::timestamptz IS NULL
                  OR created_at <= $3::timestamptz
              )
        ) sub

        WHERE cat IS NOT NULL
          AND TRIM(cat) <> ''

        GROUP BY cat

        ORDER BY
            neg_count DESC,
            high_priority_count DESC,
            total_count DESC
        `,
    [productId, startDate, endDate],
  );

  const categories: CategoryCorrelation[] = categoryRes.rows.map((row) => {
    const negCount = parseInt(row.neg_count, 10) || 0;

    const highCount = parseInt(row.high_priority_count, 10) || 0;

    const totalCount = parseInt(row.total_count, 10) || 0;

    return {
      category: String(row.cat),

      total_count: totalCount,

      neg_count: negCount,

      pos_count: parseInt(row.pos_count, 10) || 0,

      high_priority_count: highCount,

      neg_share_percent:
        totalNegative > 0 ? (negCount / totalNegative) * 100 : 0,

      high_priority_share_percent:
        totalHighPriority > 0 ? (highCount / totalHighPriority) * 100 : 0,
    };
  });

  const leading = categories.find((category) => category.neg_count > 0) || null;

  let observedSignalStatement: string;

  if (leading && totalNegative > 0) {
    const negativeNumerator = leading.neg_count;

    const negativeDenominator = totalNegative;

    const highNumerator = leading.high_priority_count;

    const highDenominator = totalHighPriority;

    const negativeShare = leading.neg_share_percent.toFixed(1);

    if (totalHighPriority > 0) {
      observedSignalStatement =
        `${leading.category} appears in ` +
        `${negativeNumerator} of ${negativeDenominator} ` +
        `negative feedback items (${negativeShare}%) and ` +
        `${highNumerator} of ${highDenominator} high-priority ` +
        `feedback items during ${periodLabel}.`;
    } else {
      observedSignalStatement =
        `${leading.category} appears in ` +
        `${negativeNumerator} of ${negativeDenominator} ` +
        `negative feedback items (${negativeShare}%) ` +
        `during ${periodLabel}.`;
    }
  } else if (totalFeedback > 0) {
    observedSignalStatement = `No category contains negative feedback in ${periodLabel}.`;
  } else {
    observedSignalStatement = "No feedback was recorded in this period.";
  }

  return {
    total_feedback: totalFeedback,

    total_negative: totalNegative,
    total_positive: totalPositive,
    total_neutral: totalNeutral,
    total_mixed: totalMixed,

    total_high_priority: totalHighPriority,
    total_medium_priority: totalMediumPriority,
    total_low_priority: totalLowPriority,

    average_rating: averageRating,

    leading_negative_category: leading?.category || null,

    leading_negative_category_neg_share: leading?.neg_share_percent || 0,

    leading_negative_category_high_priority_share:
      leading?.high_priority_share_percent || 0,

    observed_signal_statement: observedSignalStatement,

    categories,

    period_key: periodKey,
    period_label: periodLabel,

    /**
     * Backwards compatibility.
     */
    primary_culprit_category: leading?.category || "None",

    primary_culprit_neg_share: leading?.neg_share_percent || 0,

    primary_culprit_high_priority_share:
      leading?.high_priority_share_percent || 0,

    quantified_impact_statement: observedSignalStatement,
  };
}

/* ============================================================
 * FEEDBACK EVIDENCE
 * ============================================================ */

async function getFeedbackSamples(
  productId: string,
  pool: Pool,
  limit = 80,
  startDate: Date | null = null,
  endDate: Date | null = null,
): Promise<FeedbackContext[]> {
  const res = await pool.query(
    `
        SELECT
            id,
            feedback,
            rating,
            sentiment_label,
            priority_label,
            categories,
            category_name,
            raw_ai_metadata,
            created_at

        FROM feedbacks

        WHERE product_id = $1
          AND deleted_at IS NULL
          AND (
              $2::timestamptz IS NULL
              OR created_at >= $2::timestamptz
          )
          AND (
              $3::timestamptz IS NULL
              OR created_at <= $3::timestamptz
          )

        ORDER BY
            CASE
                WHEN priority_label ILIKE '%critical%'
                    THEN 0

                WHEN priority_label ILIKE '%high%'
                    THEN 1

                WHEN sentiment_label ILIKE 'negative'
                    THEN 2

                ELSE 3
            END,

            created_at DESC

        LIMIT $4
        `,
    [productId, startDate, endDate, limit],
  );

  return res.rows.map(normalizeFeedbackMetadata);
}

/* ============================================================
 * EVIDENCE / SIGNAL HELPERS
 * ============================================================ */

function calculateEvidenceStrength(metrics: ImpactCorrelationMetrics): {
  strength: EvidenceStrength;
  note: string;
} {
  const total = metrics.total_feedback;
  const negative = metrics.total_negative;

  if (total < 10) {
    return {
      strength: "limited",
      note:
        `Only ${total} feedback item${total === 1 ? "" : "s"} ` +
        `were available in this period. Treat patterns as early signals.`,
    };
  }

  if (negative > 0 && negative < 5) {
    return {
      strength: "limited",
      note:
        `The period contains ${total} feedback items, but only ` +
        `${negative} negative item${negative === 1 ? "" : "s"}. ` +
        `Negative percentages should be interpreted cautiously.`,
    };
  }

  if (total < 50) {
    return {
      strength: "moderate",
      note:
        `${total} feedback items were analyzed. Patterns are useful ` +
        `for prioritization but should still be validated against ` +
        `supporting feedback.`,
    };
  }

  return {
    strength: "strong",
    note:
      `${total} feedback items were analyzed. Findings are still ` +
      `presented with supporting evidence rather than as causal facts.`,
  };
}

function buildDataContext(metrics: ImpactCorrelationMetrics): DataContext {
  const evidence = calculateEvidenceStrength(metrics);

  return {
    total_feedback: metrics.total_feedback,

    positive: metrics.total_positive,

    negative: metrics.total_negative,

    neutral: metrics.total_neutral,

    mixed: metrics.total_mixed,

    high_priority: metrics.total_high_priority,

    medium_priority: metrics.total_medium_priority,

    low_priority: metrics.total_low_priority,

    average_rating: metrics.average_rating,

    evidence_strength: evidence.strength,

    evidence_note: evidence.note,
  };
}

function aggregateStructuredIssues(
  feedbacks: FeedbackContext[],
): ReportedIssue[] {
  const map = new Map<
    string,
    {
      issue: string;
      topic: string | null;
      severities: Array<"low" | "medium" | "high" | "critical" | null>;
      ids: Set<string>;
    }
  >();

  for (const feedback of feedbacks) {
    for (const issue of feedback.issues) {
      const normalizedKey = `${issue.topic || ""}::${issue.issue}`
        .trim()
        .toLowerCase();

      if (!normalizedKey) continue;

      let entry = map.get(normalizedKey);

      if (!entry) {
        entry = {
          issue: truncateText(issue.issue, 180),

          topic: issue.topic ? truncateText(issue.topic, 80) : null,

          severities: [],

          ids: new Set<string>(),
        };

        map.set(normalizedKey, entry);
      }

      entry.ids.add(feedback.id);

      entry.severities.push(normalizeSeverity(issue.severity));
    }
  }

  function strongestSeverity(
    values: Array<"low" | "medium" | "high" | "critical" | null>,
  ): "low" | "medium" | "high" | "critical" | null {
    if (values.includes("critical")) return "critical";
    if (values.includes("high")) return "high";
    if (values.includes("medium")) return "medium";
    if (values.includes("low")) return "low";

    return null;
  }

  return Array.from(map.values())
    .map((entry) => ({
      issue: entry.issue,

      topic: entry.topic,

      severity: strongestSeverity(entry.severities),

      evidence_count: entry.ids.size,

      evidence_feedback_ids: Array.from(entry.ids),

      /**
       * Until issue clustering exists,
       * this comes from representative evidence.
       */
      full_period_count: false,
    }))
    .sort((a, b) => {
      const severityRank = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      const aSeverity = a.severity ? severityRank[a.severity] : 0;

      const bSeverity = b.severity ? severityRank[b.severity] : 0;

      return bSeverity - aSeverity || b.evidence_count - a.evidence_count;
    })
    .slice(0, 10);
}

function aggregateRootCauseHypotheses(
  feedbacks: FeedbackContext[],
): RootCauseHypothesis[] {
  const results: RootCauseHypothesis[] = [];

  const seen = new Set<string>();

  for (const feedback of feedbacks) {
    for (const hypothesis of feedback.root_cause_hypotheses) {
      const normalized = hypothesis.hypothesis.trim().toLowerCase();

      if (!normalized) continue;

      const key = `${normalized}:${feedback.id}`;

      if (seen.has(key)) continue;

      seen.add(key);

      results.push({
        hypothesis: truncateText(hypothesis.hypothesis, 220),

        confidence: hypothesis.confidence,

        evidence_feedback_ids: [feedback.id],
      });
    }
  }

  return results.slice(0, 6);
}

function normalizeStrengthLabel(value: string): string {
  // Keep fallback aggregation industry-agnostic. Semantic grouping belongs to
  // the synthesis model (or a future embedding-based clustering layer), not a
  // growing dictionary of sample-specific phrases.
  return value.trim();
}

function buildPositiveStrengths(
  feedbacks: FeedbackContext[],
): StrengthSignal[] {
  const map = new Map<string, { label: string; ids: Set<string> }>();

  for (const feedback of feedbacks) {
    if (
      !String(feedback.sentiment_label).toLowerCase().includes("positive") &&
      !String(feedback.sentiment_label).toLowerCase().includes("mixed")
    ) {
      continue;
    }

    for (const attribute of feedback.positive_attributes) {
      const clean = normalizeStrengthLabel(truncateText(attribute, 160));

      if (!clean) continue;

      const key = clean.toLowerCase();

      if (!map.has(key)) {
        map.set(key, { label: clean, ids: new Set<string>() });
      }

      map.get(key)!.ids.add(feedback.id);
    }
  }

  return Array.from(map.values())
    .map(({ label, ids }) => ({
      strength: label,

      evidence_count: ids.size,

      evidence_feedback_ids: Array.from(ids),
    }))
    .sort((a, b) => b.evidence_count - a.evidence_count)
    .slice(0, 5);
}

function hasCancellationSignal(feedbacks: FeedbackContext[]): boolean {
  return feedbacks.some((feedback) =>
    feedback.intents.some((intent) =>
      /cancel|churn|leave|terminate/i.test(intent),
    ),
  );
}

function deriveAttentionStatus(
  metrics: ImpactCorrelationMetrics,
  issues: ReportedIssue[],
  feedbacks: FeedbackContext[],
): AttentionStatus {
  if (metrics.total_feedback === 0) {
    return "Stable";
  }

  const hasCriticalIssue = issues.some(
    (issue) => issue.severity === "critical",
  );

  if (hasCriticalIssue) {
    return "Critical Alert";
  }

  const hasHighIssue = issues.some((issue) => issue.severity === "high");

  const cancellationSignal = hasCancellationSignal(feedbacks);

  if (hasHighIssue && (metrics.total_high_priority > 0 || cancellationSignal)) {
    return "Action Required";
  }

  if (metrics.total_negative > 0 || metrics.total_high_priority > 0) {
    return "Needs Attention";
  }

  if (
    metrics.total_positive > metrics.total_negative &&
    metrics.total_negative === 0
  ) {
    return "Healthy";
  }

  return "Stable";
}

/* ============================================================
 * PERIOD-AWARE TREND SNAPSHOT
 * ============================================================ */

function determineTrendBucket(
  periodKey: string,
  startDate: Date | null,
  endDate: Date | null,
): "hour" | "day" | "week" | "month" {
  if (periodKey === "today") {
    return "hour";
  }

  if (periodKey === "7d" || periodKey === "30d") {
    return "day";
  }

  if (periodKey === "90d") {
    return "week";
  }

  if (periodKey.startsWith("custom_") && startDate && endDate) {
    const days =
      Math.abs(endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);

    if (days <= 2) return "hour";
    if (days <= 45) return "day";
    if (days <= 180) return "week";

    return "month";
  }

  return "month";
}

function formatTrendLabel(
  value: Date,
  bucket: "hour" | "day" | "week" | "month",
): string {
  if (bucket === "hour") {
    return value.toLocaleTimeString("en-US", {
      hour: "numeric",
    });
  }

  if (bucket === "day") {
    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (bucket === "week") {
    return `Week of ${value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }

  return value.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

async function buildChartSnapshot(
  productId: string,
  pool: Pool,
  metrics: ImpactCorrelationMetrics,
  feedbacks: FeedbackContext[],
  periodKey: string,
  startDate: Date | null,
  endDate: Date | null,
): Promise<ChartSnapshot> {
  const bucket = determineTrendBucket(periodKey, startDate, endDate);

  const trendRes = await pool.query(
    `
            SELECT
                date_trunc(
                    $4::text,
                    created_at
                ) AS bucket,

                COUNT(*) AS total,

                COUNT(*) FILTER (
                    WHERE sentiment_label ILIKE 'positive'
                ) AS positive,

                COUNT(*) FILTER (
                    WHERE sentiment_label ILIKE 'negative'
                ) AS negative,

                COUNT(*) FILTER (
                    WHERE sentiment_label ILIKE 'neutral'
                ) AS neutral,

                COUNT(*) FILTER (
                    WHERE sentiment_label ILIKE 'mixed'
                ) AS mixed

            FROM feedbacks

            WHERE product_id = $1
              AND deleted_at IS NULL
              AND (
                  $2::timestamptz IS NULL
                  OR created_at >= $2::timestamptz
              )
              AND (
                  $3::timestamptz IS NULL
                  OR created_at <= $3::timestamptz
              )

            GROUP BY 1
            ORDER BY 1 ASC
            `,
    [productId, startDate, endDate, bucket],
  );

  const trend = trendRes.rows.map((row) => {
    const value = new Date(row.bucket);

    return {
      bucket: value.toISOString(),

      label: formatTrendLabel(value, bucket),

      total: parseInt(row.total, 10) || 0,

      positive: parseInt(row.positive, 10) || 0,

      negative: parseInt(row.negative, 10) || 0,

      neutral: parseInt(row.neutral, 10) || 0,

      mixed: parseInt(row.mixed, 10) || 0,
    };
  });

  const priorityFeedback = feedbacks
    .filter((feedback) => /high|critical/i.test(feedback.priority_label))
    .slice(0, 5)
    .map((feedback) => ({
      feedback_id: feedback.id,

      text: truncateText(feedback.safe_feedback_excerpt, 240),

      category: feedback.categories[0] || "Uncategorized",

      rating: feedback.rating,

      sentiment: feedback.sentiment_label,

      priority: feedback.priority_label,
    }));

  return {
    sentiment: [
      {
        name: "Positive",
        value: metrics.total_positive,
      },
      {
        name: "Neutral",
        value: metrics.total_neutral,
      },
      {
        name: "Negative",
        value: metrics.total_negative,
      },
      {
        name: "Mixed",
        value: metrics.total_mixed,
      },
    ],

    priority: [
      {
        name: "High",
        value: metrics.total_high_priority,
      },
      {
        name: "Medium",
        value: metrics.total_medium_priority,
      },
      {
        name: "Low",
        value: metrics.total_low_priority,
      },
    ],

    trend,

    priority_feedback: priorityFeedback,

    /**
     * Legacy alias.
     */
    top_issues: priorityFeedback.map((item) => ({
      text: item.text,

      category: item.category,

      rating: item.rating,
    })),
  };
}

/* ============================================================
 * EXECUTIVE BRIEF ENTRYPOINT
 * ============================================================ */

export async function getOrGenerateExecutiveBrief(
  productId: string,
  pool: Pool,
  forceRefresh = false,
  period = "all",
  customStart?: string,
  customEnd?: string,
  options: {
    cacheOnly?: boolean;
  } = {},
): Promise<{
  brief: ExecutiveBrief | null;
  metrics: ImpactCorrelationMetrics | null;
  cached: boolean;
}> {
  const { periodKey, startDate, endDate, periodLabel } = parsePeriodBounds(
    period,
    customStart,
    customEnd,
  );

  const cacheOnly = options.cacheOnly === true;

  /**
   * Prefer latest saved brief unless explicitly regenerating.
   */
  if (!forceRefresh) {
    const cacheRes = await pool.query(
      `
                SELECT
                    brief,
                    metrics,
                    created_at,
                    start_date,
                    end_date

                FROM executive_briefs

                WHERE product_id = $1
                  AND period_key = $2

                ORDER BY created_at DESC

                LIMIT 1
                `,
      [productId, periodKey],
    );

    if (cacheRes.rows.length > 0) {
      const cachedRow = cacheRes.rows[0];

      const generatedAt = cachedRow.created_at;

      const cachedBrief: ExecutiveBrief = {
        ...cachedRow.brief,

        period_key: periodKey,

        period_label: periodLabel,

        generated_at: generatedAt,

        is_cached: true,

        window_start: cachedRow.start_date,

        window_end: cachedRow.end_date,

        is_stale: isPeriodBriefStale(periodKey, generatedAt),
      };

      return {
        brief: cachedBrief,

        metrics: cachedRow.metrics || null,

        cached: true,
      };
    }

    if (cacheOnly) {
      return {
        brief: null,
        metrics: null,
        cached: false,
      };
    }
  }

  const metrics = await calculateImpactCorrelation(
    productId,
    pool,
    startDate,
    endDate,
    periodKey,
    periodLabel,
  );

  if (metrics.total_feedback === 0) {
    return {
      brief: null,
      metrics: null,
      cached: false,
    };
  }

  /**
   * Representative evidence set.
   *
   * Deterministic full-period counts still come from SQL metrics.
   */
  const feedbacks = await getFeedbackSamples(
    productId,
    pool,
    80,
    startDate,
    endDate,
  );

  const chartSnapshot = await buildChartSnapshot(
    productId,
    pool,
    metrics,
    feedbacks,
    periodKey,
    startDate,
    endDate,
  );

  const metricsWithCharts: ImpactCorrelationMetrics = {
    ...metrics,

    chart_snapshot: chartSnapshot,
  };

  const productRes = await pool.query(
    `
            SELECT
                name,
                industry,
                description

            FROM products

            WHERE id = $1
            `,
    [productId],
  );

  const product = productRes.rows[0] || {
    name: "Product",
    industry: "General",
    description: "",
  };

  const synthesizedBrief = await synthesizeWithGemini(
    product,
    metricsWithCharts,
    feedbacks,
    periodLabel,
  );

  const generatedAt = new Date().toISOString();

  const briefPayload = {
    ...synthesizedBrief,

    period_key: periodKey,

    period_label: periodLabel,
  };

  try {
    await pool.query(
      `
            INSERT INTO executive_briefs (
                product_id,
                period_key,
                start_date,
                end_date,
                brief,
                metrics,
                feedback_count_at_generation,
                created_at,
                updated_at
            )

            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8::timestamptz,
                $8::timestamptz
            )
            `,
      [
        productId,
        periodKey,
        startDate,
        endDate,
        JSON.stringify(briefPayload),
        JSON.stringify(metricsWithCharts),
        metrics.total_feedback,
        generatedAt,
      ],
    );
  } catch (saveErr) {
    console.error("Failed to cache executive brief:", saveErr);
  }

  return {
    brief: {
      ...briefPayload,

      generated_at: generatedAt,

      is_cached: false,

      window_start: startDate?.toISOString() ?? null,

      window_end: endDate?.toISOString() ?? null,

      is_stale: false,
    },

    metrics: metricsWithCharts,

    cached: false,
  };
}

/* ============================================================
 * CACHE STALENESS
 * ============================================================ */

function isPeriodBriefStale(
  periodKey: string,
  generatedAt: string | Date,
): boolean {
  /**
   * Fixed custom ranges remain stable
   * until explicitly regenerated.
   */
  if (periodKey.startsWith("custom_")) {
    return false;
  }

  const generatedDay = new Date(generatedAt).toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);

  return generatedDay < today;
}

/* ============================================================
 * GEMINI SYNTHESIS
 * ============================================================ */

async function synthesizeWithGemini(
  product: {
    name: string;
    industry: string;
    description: string;
  },

  metrics: ImpactCorrelationMetrics,

  feedbacks: FeedbackContext[],

  periodLabel: string,
): Promise<
  Omit<
    ExecutiveBrief,
    "generated_at" | "is_cached" | "period_key" | "period_label"
  >
> {
  const issues = aggregateStructuredIssues(feedbacks);

  const existingHypotheses = aggregateRootCauseHypotheses(feedbacks);

  const strengths = buildPositiveStrengths(feedbacks);

  const dataContext = buildDataContext(metrics);

  const deterministicStatus = deriveAttentionStatus(metrics, issues, feedbacks);

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateFallbackBrief(
      product,
      metrics,
      feedbacks,
      issues,
      existingHypotheses,
      strengths,
      dataContext,
      deterministicStatus,
      periodLabel,
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  /**
   * Structured evidence sent to Gemini.
   *
   * Notice that the model receives:
   * - IDs
   * - summaries
   * - structured issues
   * - topics
   * - requests
   * - strengths
   * - hypotheses
   *
   * Raw customer text is only provided as a PII-minimized excerpt.
   */
  const evidencePayload = feedbacks.map((feedback) => ({
    feedbackId: feedback.id,

    sentiment: feedback.sentiment_label,

    priority: feedback.priority_label,

    rating: feedback.rating,

    categories: feedback.categories,

    summary: feedback.summary,

    intents: feedback.intents,

    topics: feedback.topics,

    issues: feedback.issues,

    requestedCapabilities: feedback.requested_capabilities,

    positiveAttributes: feedback.positive_attributes,

    rootCauseHypotheses: feedback.root_cause_hypotheses,

    customerTextExcerpt: feedback.safe_feedback_excerpt,
  }));

  const categoryMetrics = metrics.categories.map((category) => ({
    category: category.category,

    feedbackCount: category.total_count,

    negativeCount: category.neg_count,

    positiveCount: category.pos_count,

    highPriorityCount: category.high_priority_count,

    negativeShareOfPeriodNegatives: Number(
      category.neg_share_percent.toFixed(1),
    ),

    highPriorityShare: Number(category.high_priority_share_percent.toFixed(1)),
  }));

  const prompt = `
You are an AI Customer Feedback Intelligence analyst.

You are NOT a COO consultant.
You are NOT an operations consultant.
You are NOT a business forecasting system.

Your job is to turn customer feedback into trustworthy, evidence-backed business intelligence.

The business should understand:

1. What customers are actually saying.
2. Which customer-reported problems deserve attention.
3. What positive experiences should be preserved.
4. What customers are requesting.
5. Which observations are facts versus hypotheses.
6. What the business should investigate or act on next.
7. Which source feedback supports every important conclusion.

==================================================
GENERAL REASONING RULES
==================================================

These rules apply to every industry and every type of feedback.
They are invariants, not examples tied to any particular dataset.

1. FACTUAL ENTAILMENT
Every statement must be supported by the supplied deterministic metrics or by
one or more supplied feedback records. Do not add facts, relationships,
mechanisms, explanations, actors, or events that are absent from the evidence.

2. QUANTITATIVE DISCIPLINE
All quantitative language must be entailed by supplied counts or percentages.
Do not describe results as equal, evenly split, dominant, majority, minority,
widespread, significant, common, rare, substantial, frequent, or similar unless
the supplied numbers clearly support that description.

When a percentage matters, include its numerator and denominator.

3. CAUSAL DISCIPLINE
Do not convert correlation, sequence, association, co-occurrence, or a symptom
into causation. A root-cause hypothesis may introduce only concepts supported
by its linked source evidence. If the evidence explains WHAT happened but not
WHY it happened, return no root-cause hypothesis for that issue.

4. ENTITY DISCIPLINE
A feedback record is not automatically a unique customer, patient, user,
account, household, organization, or business. Use "feedback item(s)" or
"feedback record(s)" for counts unless unique-entity identity or deduplication
is explicitly supplied. You may use the industry's natural noun descriptively,
but never convert record counts into unique-person counts.

5. EVIDENCE TRACEABILITY
Every important sampled claim must reference valid supporting feedback IDs.
Every aggregate claim must match the deterministic metrics supplied above.
Never manufacture an evidence ID or count.

6. RECOMMENDATION DISCIPLINE
Recommendations must be grounded in observed evidence and framed as actions to
investigate, verify, review, clarify, preserve, monitor, or improve. Do not
predict guaranteed outcomes, ROI, revenue changes, churn reduction, savings,
or other business impact unless such outcome data is explicitly supplied.

7. INDUSTRY AGNOSTICISM
Industry is context, not a constraint. Understand the meaning of the feedback
first. Do not force an issue into an industry stereotype, department, workflow,
or predefined playbook. Unexpected feedback remains valid evidence.

==================================================
PRODUCT
==================================================

Product / Service:
${product.name}

Industry:
${product.industry}

Description:
${product.description || "Not provided"}

Time period:
${periodLabel}

==================================================
FULL-PERIOD DETERMINISTIC METRICS
==================================================

Total feedback:
${metrics.total_feedback}

Positive:
${metrics.total_positive}

Negative:
${metrics.total_negative}

Neutral:
${metrics.total_neutral}

Mixed:
${metrics.total_mixed}

High priority:
${metrics.total_high_priority}

Medium priority:
${metrics.total_medium_priority}

Low priority:
${metrics.total_low_priority}

Average rating:
${
  metrics.average_rating === null
    ? "Not enough rating data"
    : `${metrics.average_rating.toFixed(1)} / 5`
}

Observed leading-category signal:

${metrics.observed_signal_statement}

IMPORTANT:

This statement is correlation/concentration only.

A category is NOT automatically:
- a root cause
- a driver
- an issue
- a bottleneck
- a department failure

Never use "driver", "caused by", "culprit", or "directly responsible for"
unless the source feedback itself explicitly establishes causality.

==================================================
CATEGORY METRICS
==================================================

${JSON.stringify(categoryMetrics, null, 2)}

==================================================
DATA SUFFICIENCY
==================================================

Evidence strength:
${dataContext.evidence_strength}

Evidence note:
${dataContext.evidence_note}

Always show numerator + denominator when discussing important percentages.

Example:

GOOD:
"[Category] appears in X of Y negative feedback items (Z%)."

BAD:
"[Category] accounts for Z% of dissatisfaction."

==================================================
STRUCTURED CUSTOMER EVIDENCE
==================================================

${JSON.stringify(evidencePayload, null, 2)}

==================================================
IMPORTANT CONCEPTS
==================================================

CATEGORY
A configured business classification supplied by the organization.

TOPIC
The broad subject discussed in the feedback.

ISSUE
The specific problem directly reported or clearly described by the feedback.

ROOT-CAUSE HYPOTHESIS
A possible explanation for why an issue occurred, only when supported by linked evidence.

Never convert a category into a root cause.

If feedback directly states an observable problem, keep that statement as an ISSUE.
Do not relabel the symptom itself as a root cause, and do not add an unseen mechanism
just because that mechanism would be plausible in the industry.

==================================================
STRICT EVIDENCE RULES
==================================================

Every important conclusion must be grounded in either:

A) the deterministic full-period metrics, or
B) one or more supplied feedback IDs.

Never invent any mechanism, actor, internal process, department, technical cause,
operational cause, unique-entity count, financial effect, business outcome, or future
result that is not supported by the supplied evidence.

Do not prescribe a specific remedy merely because it is conventional for that industry.
A remedy is allowed only when it follows reasonably from the observed evidence, and the
wording must not imply that the remedy will produce an unmeasured outcome.

==================================================
ATTENTION STATUS
==================================================

Choose exactly one:

Critical Alert
Action Required
Needs Attention
Stable
Healthy

Guidance:

Critical Alert:
Use only when supplied evidence contains credible critical-severity customer harm such as serious security, safety, major access, or similarly severe explicit impact.

Action Required:
Use when clear high-severity / high-urgency customer problems are supported by evidence.

Needs Attention:
Use for meaningful negative signals that should be investigated but are not clearly urgent emergencies.

Stable:
Use when there are no material concerning customer signals.

Healthy:
Use when feedback is predominantly positive with no meaningful high-severity concern.

Do NOT escalate merely because a category has a high percentage in a tiny negative sample.

==================================================
KEY FINDINGS
==================================================

Return up to 5.

A finding should describe an OBSERVED customer signal.

Examples of acceptable structure:

"[Category] appears in X of Y negative feedback items (Z%)."

"X reviewed feedback items describe the same reported problem."

"X reviewed feedback items contain a similar positive signal."

Do not convert feedback-record counts into unique-person counts, and do not turn an
observed category concentration into a causal statement.

Each evidence-based finding must reference feedback IDs when based on sampled customer evidence.

When using deterministic category metrics, fullPeriodCount may be true.

==================================================
REPORTED ISSUES
==================================================

Return up to 8 actual customer-reported issues.

Do NOT use category names alone as issues.

Structure:

Category:
[configured business category]

Issue:
[specific problem directly described by the feedback]

If several feedback records clearly describe the same problem,
you may combine them.

Until persistent issue clustering exists, treat counts derived from
the provided representative evidence as evidence counts, not exact
global population frequencies.

ROOT-CAUSE HYPOTHESES
==================================================

Return 0-5.

A root-cause hypothesis is OPTIONAL. Returning [] is correct whenever the linked
evidence does not explain why an issue occurred.

A valid hypothesis must satisfy ALL of the following:

- It is tied to one or more supplied feedback IDs.
- Its substantive concepts are present in, or directly entailed by, that evidence.
- It explains a possible WHY rather than merely restating WHAT happened.
- It is expressed as a hypothesis, never as confirmed fact.
- Its confidence is qualitative: low, medium, or high.
- It does not introduce an unseen mechanism, system, process, actor, department,
  implementation detail, or industry assumption.

If the supporting evidence only describes a symptom, outcome, complaint, request,
or sequence of events, keep it as a reported issue and return no root-cause
hypothesis for that issue.

Do not reward plausibility. Reward traceability to evidence.

==================================================
RECOMMENDED ACTIONS
==================================================

Return 0-5.

Each action must contain:

- title
- area
- urgency: Immediate | Soon | Monitor
- action
- reason
- qualitative expectedEffect
- evidence feedback IDs

The action should answer:

"What should this business investigate, preserve, clarify, or improve based on customer feedback?"

A good recommendation:
- identifies the evidence-backed issue or signal
- proposes a review, verification, clarification, monitoring, preservation, or improvement step
- avoids assuming an internal department, mechanism, remedy, or measurable outcome that is not supplied

A bad recommendation:
- prescribes an unsupported internal change
- introduces a remedy unrelated to the evidence
- promises a quantitative or guaranteed business result

==================================================
STRENGTHS
==================================================

Return 0-5 strengths.

Strengths must come from actual positive/mixed feedback.

Strengths should summarize concrete positive attributes found in the supplied feedback.
Do not force them into a predefined industry vocabulary.

If positive evidence is insufficient, return [].

Do not return generic praise such as:

"Maintain high standards."

==================================================
EXECUTIVE SUMMARY
==================================================

Write 2-4 concise sentences covering:

- the overall feedback picture
- the most important supported concern
- an important positive signal if present
- a material evidence limitation only when it adds information beyond the separate
  data-context evidence note

Do not exaggerate or restate the standard evidence note verbatim.
Do not convert feedback counts into unique-person counts.
Do not repeat percentages without numerator and denominator.

==================================================
FINAL QUALITY CHECK
==================================================

Before returning JSON verify:

- Did I confuse a category with an issue?
- Did I confuse correlation with causation?
- Did I invent a business outcome?
- Did I invent a cause, actor, mechanism, department, or business outcome?
- Does every major sampled claim reference valid feedback IDs?
- Does every aggregate claim match the deterministic metrics?
- Did I convert feedback-item counts into unique people or organizations?
- Did I use comparative language that the numbers do not support?
- Did I account for data sufficiency without overstating it?
- Are root causes truly evidence-grounded hypotheses rather than restated issues?
- Are recommendations grounded in evidence and free of guaranteed outcomes?
`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          responseMimeType: "application/json",

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              headline: {
                type: Type.STRING,
              },

              attentionStatus: {
                type: Type.STRING,

                enum: [
                  "Critical Alert",
                  "Action Required",
                  "Needs Attention",
                  "Stable",
                  "Healthy",
                ],
              },

              executiveSummary: {
                type: Type.STRING,
              },

              keyFindings: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    finding: {
                      type: Type.STRING,
                    },

                    type: {
                      type: Type.STRING,

                      enum: [
                        "negative_signal",
                        "positive_signal",
                        "feature_request",
                        "risk_signal",
                        "mixed_signal",
                        "operational_signal",
                      ],
                    },

                    evidenceCount: {
                      type: Type.INTEGER,
                    },

                    evidenceFeedbackIds: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },

                    fullPeriodCount: {
                      type: Type.BOOLEAN,
                    },
                  },

                  required: [
                    "finding",
                    "type",
                    "evidenceCount",
                    "evidenceFeedbackIds",
                    "fullPeriodCount",
                  ],
                },
              },

              reportedIssues: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    issue: {
                      type: Type.STRING,
                    },

                    topic: {
                      type: Type.STRING,
                    },

                    severity: {
                      type: Type.STRING,

                      enum: ["low", "medium", "high", "critical", "unknown"],
                    },

                    evidenceCount: {
                      type: Type.INTEGER,
                    },

                    evidenceFeedbackIds: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },

                    fullPeriodCount: {
                      type: Type.BOOLEAN,
                    },
                  },

                  required: [
                    "issue",
                    "topic",
                    "severity",
                    "evidenceCount",
                    "evidenceFeedbackIds",
                    "fullPeriodCount",
                  ],
                },
              },

              rootCauseHypotheses: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    hypothesis: {
                      type: Type.STRING,
                    },

                    confidence: {
                      type: Type.STRING,

                      enum: ["low", "medium", "high"],
                    },

                    evidenceFeedbackIds: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },
                  },

                  required: ["hypothesis", "confidence", "evidenceFeedbackIds"],
                },
              },

              recommendedActions: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    rank: {
                      type: Type.INTEGER,
                    },

                    title: {
                      type: Type.STRING,
                    },

                    area: {
                      type: Type.STRING,
                    },

                    urgency: {
                      type: Type.STRING,

                      enum: ["Immediate", "Soon", "Monitor"],
                    },

                    action: {
                      type: Type.STRING,
                    },

                    reason: {
                      type: Type.STRING,
                    },

                    expectedEffect: {
                      type: Type.STRING,
                    },

                    evidenceFeedbackIds: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },
                  },

                  required: [
                    "rank",
                    "title",
                    "area",
                    "urgency",
                    "action",
                    "reason",
                    "expectedEffect",
                    "evidenceFeedbackIds",
                  ],
                },
              },

              strengths: {
                type: Type.ARRAY,

                items: {
                  type: Type.OBJECT,

                  properties: {
                    strength: {
                      type: Type.STRING,
                    },

                    evidenceCount: {
                      type: Type.INTEGER,
                    },

                    evidenceFeedbackIds: {
                      type: Type.ARRAY,

                      items: {
                        type: Type.STRING,
                      },
                    },
                  },

                  required: [
                    "strength",
                    "evidenceCount",
                    "evidenceFeedbackIds",
                  ],
                },
              },
            },

            required: [
              "headline",
              "attentionStatus",
              "executiveSummary",
              "keyFindings",
              "reportedIssues",
              "rootCauseHypotheses",
              "recommendedActions",
              "strengths",
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");

      return normalizeGeneratedBrief({
        parsed,
        product,
        metrics,
        feedbacks,
        deterministicIssues: issues,
        deterministicHypotheses: existingHypotheses,
        deterministicStrengths: strengths,
        dataContext,
        deterministicStatus,
        periodLabel,
      });
    } catch (err: any) {
      console.warn(
        `Gemini executive brief attempt ${attempt} failed:`,
        err?.message || "Unknown error",
      );

      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  return generateFallbackBrief(
    product,
    metrics,
    feedbacks,
    issues,
    existingHypotheses,
    strengths,
    dataContext,
    deterministicStatus,
    periodLabel,
  );
}

/* ============================================================
 * GENERATED OUTPUT VALIDATION
 * ============================================================ */

function validEvidenceIds(
  candidateIds: unknown,
  allowedIds: Set<string>,
): string[] {
  if (!Array.isArray(candidateIds)) {
    return [];
  }

  return Array.from(
    new Set(candidateIds.map(String).filter((id) => allowedIds.has(id))),
  );
}

function normalizeGeneratedBrief({
  parsed,
  product,
  metrics,
  feedbacks,
  deterministicIssues,
  deterministicHypotheses,
  deterministicStrengths,
  dataContext,
  deterministicStatus,
  periodLabel,
}: {
  parsed: any;

  product: {
    name: string;
    industry: string;
    description: string;
  };

  metrics: ImpactCorrelationMetrics;

  feedbacks: FeedbackContext[];

  deterministicIssues: ReportedIssue[];

  deterministicHypotheses: RootCauseHypothesis[];

  deterministicStrengths: StrengthSignal[];

  dataContext: DataContext;

  deterministicStatus: AttentionStatus;

  periodLabel: string;
}): Omit<
  ExecutiveBrief,
  "generated_at" | "is_cached" | "period_key" | "period_label"
> {
  const allowedIds = new Set(feedbacks.map((feedback) => feedback.id));
  const feedbackById = new Map(
    feedbacks.map((feedback) => [feedback.id, feedback]),
  );

  const allowedStatuses: AttentionStatus[] = [
    "Critical Alert",
    "Action Required",
    "Needs Attention",
    "Stable",
    "Healthy",
  ];

  let status: AttentionStatus = allowedStatuses.includes(parsed.attentionStatus)
    ? parsed.attentionStatus
    : deterministicStatus;

  /**
   * Guard against model over-escalation.
   *
   * Critical requires actual critical structured evidence.
   */
  const hasCriticalEvidence = deterministicIssues.some(
    (issue) => issue.severity === "critical",
  );

  if (status === "Critical Alert" && !hasCriticalEvidence) {
    status =
      deterministicStatus === "Critical Alert"
        ? "Critical Alert"
        : deterministicStatus;
  }

  const keyFindings: KeyFinding[] = Array.isArray(parsed.keyFindings)
    ? parsed.keyFindings
        .map((item: any) => {
          const ids = validEvidenceIds(item.evidenceFeedbackIds, allowedIds);

          return {
            finding: truncateText(item.finding, 320),

            type: [
              "negative_signal",
              "positive_signal",
              "feature_request",
              "risk_signal",
              "mixed_signal",
              "operational_signal",
            ].includes(item.type)
              ? item.type
              : "operational_signal",

            evidence_count: item.fullPeriodCount
              ? Math.max(0, Number(item.evidenceCount) || 0)
              : ids.length,

            evidence_feedback_ids: ids,

            full_period_count: item.fullPeriodCount === true,
          };
        })
        .filter((item: KeyFinding) => Boolean(item.finding))
        .slice(0, 5)
    : [];

  const reportedIssues: ReportedIssue[] = Array.isArray(parsed.reportedIssues)
    ? parsed.reportedIssues
        .map((item: any) => {
          const ids = validEvidenceIds(item.evidenceFeedbackIds, allowedIds);

          return {
            issue: truncateText(item.issue, 220),

            topic:
              item.topic && item.topic !== "unknown"
                ? truncateText(item.topic, 100)
                : null,

            severity:
              item.severity === "unknown"
                ? null
                : normalizeSeverity(item.severity),

            // Executive synthesis currently sees representative structured issue
            // evidence rather than a persistent full-period issue-cluster table.
            // Therefore issue counts are always evidence-set counts here.
            evidence_count: ids.length,

            evidence_feedback_ids: ids,

            full_period_count: false,
          };
        })
        .filter((item: ReportedIssue) => Boolean(item.issue))
        .slice(0, 8)
    : deterministicIssues;

  const rootCauseHypotheses: RootCauseHypothesis[] = Array.isArray(
    parsed.rootCauseHypotheses,
  )
    ? parsed.rootCauseHypotheses
        .map((item: any) => {
          const ids = validEvidenceIds(item.evidenceFeedbackIds, allowedIds);

          const hypothesis = truncateText(item.hypothesis, 260);

          if (!hypothesis || ids.length === 0) {
            return null;
          }

          const evidenceText = ids
            .map((id) => feedbackById.get(id)?.safe_feedback_excerpt || "")
            .filter(Boolean)
            .join(" ");

          if (!evidenceText) {
            return null;
          }

          if (!isEvidenceGroundedHypothesis(hypothesis, evidenceText)) {
            return null;
          }

          return {
            hypothesis,
            confidence: normalizeConfidence(item.confidence),
            evidence_feedback_ids: ids,
          };
        })
        .filter(
          (item: RootCauseHypothesis | null): item is RootCauseHypothesis =>
            item !== null &&
            Boolean(item.hypothesis) &&
            item.evidence_feedback_ids.length > 0,
        )
        .slice(0, 5)
    : deterministicHypotheses
        .filter((item) => {
          const evidenceText = item.evidence_feedback_ids
            .map((id) => feedbackById.get(id)?.safe_feedback_excerpt || "")
            .filter(Boolean)
            .join(" ");

          return (
            Boolean(item.hypothesis) &&
            item.evidence_feedback_ids.length > 0 &&
            Boolean(evidenceText) &&
            isEvidenceGroundedHypothesis(item.hypothesis, evidenceText)
          );
        })
        .slice(0, 5);

  const recommendedActions: RecommendedAction[] = Array.isArray(
    parsed.recommendedActions,
  )
    ? parsed.recommendedActions
        .map((item: any, index: number) => {
          const ids = validEvidenceIds(item.evidenceFeedbackIds, allowedIds);

          const urgency: RecommendationUrgency =
            item.urgency === "Immediate" ||
            item.urgency === "Soon" ||
            item.urgency === "Monitor"
              ? item.urgency
              : "Monitor";

          return {
            rank: Number(item.rank) || index + 1,

            title: truncateText(item.title, 140),

            area: truncateText(item.area || "Customer Feedback", 120),

            urgency,

            action: truncateText(item.action, 420),

            reason: truncateText(item.reason, 420),

            expected_effect: sanitizeExpectedEffect(
              item.expectedEffect
                ? truncateText(item.expectedEffect, 320)
                : null,
            ),

            evidence_feedback_ids: ids,
          };
        })
        .filter(
          (item: RecommendedAction) =>
            Boolean(item.title && item.action && item.reason) &&
            item.evidence_feedback_ids.length > 0,
        )
        .slice(0, 5)
    : [];

  const generatedStrengths: StrengthSignal[] = Array.isArray(parsed.strengths)
    ? parsed.strengths
        .map((item: any) => {
          const ids = validEvidenceIds(item.evidenceFeedbackIds, allowedIds);

          return {
            strength: truncateText(item.strength, 200),

            evidence_count: ids.length,

            evidence_feedback_ids: ids,
          };
        })
        .filter(
          (item: StrengthSignal) =>
            Boolean(item.strength) && item.evidence_feedback_ids.length > 0,
        )
        .slice(0, 5)
    : deterministicStrengths;

  const headline = truncateText(
    parsed.headline || buildFallbackHeadline(metrics, periodLabel),
    220,
  );

  const executiveSummary = truncateText(
    parsed.executiveSummary ||
      buildFallbackExecutiveSummary(metrics, dataContext, periodLabel),
    900,
  );

  return assembleExecutiveBrief({
    headline,
    status,
    executiveSummary,
    dataContext,
    keyFindings,
    reportedIssues,
    rootCauseHypotheses,
    recommendedActions,
    strengths: generatedStrengths,
    metrics,
  });
}

/* ============================================================
 * CONSERVATIVE DETERMINISTIC FALLBACK
 * ============================================================ */

function buildFallbackHeadline(
  metrics: ImpactCorrelationMetrics,
  periodLabel: string,
): string {
  if (metrics.total_negative === 0) {
    if (metrics.total_positive > 0) {
      return (
        `Customer feedback is predominantly positive ` + `for ${periodLabel}`
      );
    }

    return (
      `No major negative customer signal identified ` + `for ${periodLabel}`
    );
  }

  if (metrics.leading_negative_category) {
    return (
      `${metrics.leading_negative_category} has the highest ` +
      `observed concentration of negative feedback in ${periodLabel}`
    );
  }

  return `Customer feedback signals for ${periodLabel}`;
}

function buildFallbackExecutiveSummary(
  metrics: ImpactCorrelationMetrics,
  dataContext: DataContext,
  periodLabel: string,
): string {
  const sentimentSummary =
    `${metrics.total_feedback} feedback items were analyzed for ${periodLabel}. ` +
    `${metrics.total_positive} were positive, ` +
    `${metrics.total_negative} negative, ` +
    `${metrics.total_neutral} neutral, and ` +
    `${metrics.total_mixed} mixed.`;

  if (metrics.leading_negative_category && metrics.total_negative > 0) {
    const leading = metrics.categories.find(
      (category) => category.category === metrics.leading_negative_category,
    );

    if (leading) {
      return (
        `${sentimentSummary} ` +
        `${leading.category} appears in ` +
        `${leading.neg_count} of ${metrics.total_negative} ` +
        `negative feedback items ` +
        `(${leading.neg_share_percent.toFixed(1)}%).`
      );
    }
  }

  return `${sentimentSummary}`;
}

function generateFallbackBrief(
  product: {
    name: string;
    industry: string;
  },

  metrics: ImpactCorrelationMetrics,

  feedbacks: FeedbackContext[],

  issues: ReportedIssue[],

  hypotheses: RootCauseHypothesis[],

  strengths: StrengthSignal[],

  dataContext: DataContext,

  status: AttentionStatus,

  periodLabel: string,
): Omit<
  ExecutiveBrief,
  "generated_at" | "is_cached" | "period_key" | "period_label"
> {
  const headline = buildFallbackHeadline(metrics, periodLabel);

  const executiveSummary = buildFallbackExecutiveSummary(
    metrics,
    dataContext,
    periodLabel,
  );

  const findings: KeyFinding[] = [];

  /**
   * Full-period category observation.
   */
  const leading = metrics.leading_negative_category
    ? metrics.categories.find(
        (category) => category.category === metrics.leading_negative_category,
      )
    : null;

  if (leading && metrics.total_negative > 0) {
    findings.push({
      finding:
        `${leading.category} appears in ` +
        `${leading.neg_count} of ` +
        `${metrics.total_negative} negative feedback items ` +
        `(${leading.neg_share_percent.toFixed(1)}%).`,

      type: "negative_signal",

      evidence_count: leading.neg_count,

      evidence_feedback_ids: feedbacks
        .filter(
          (feedback) =>
            feedback.categories.some(
              (category) => category === leading.category,
            ) && feedback.sentiment_label.toLowerCase().includes("negative"),
        )
        .map((feedback) => feedback.id)
        .slice(0, 10),

      full_period_count: true,
    });
  }

  if (metrics.total_positive > 0) {
    findings.push({
      finding:
        `${metrics.total_positive} of ${metrics.total_feedback} ` +
        `feedback items were positive during ${periodLabel}.`,

      type: "positive_signal",

      evidence_count: metrics.total_positive,

      evidence_feedback_ids: feedbacks
        .filter((feedback) =>
          feedback.sentiment_label.toLowerCase().includes("positive"),
        )
        .map((feedback) => feedback.id)
        .slice(0, 10),

      full_period_count: true,
    });
  }

  const requestedFeedback = feedbacks.filter(
    (feedback) => feedback.requested_capabilities.length > 0,
  );

  if (requestedFeedback.length > 0) {
    findings.push({
      finding:
        `${requestedFeedback.length} reviewed feedback item` +
        `${requestedFeedback.length === 1 ? "" : "s"} ` +
        `contained explicit requested capabilities.`,

      type: "feature_request",

      evidence_count: requestedFeedback.length,

      evidence_feedback_ids: requestedFeedback.map((feedback) => feedback.id),

      full_period_count: false,
    });
  }

  const recommendations = buildFallbackRecommendations(
    metrics,
    feedbacks,
    issues,
  );

  return assembleExecutiveBrief({
    headline,

    status,

    executiveSummary,

    dataContext,

    keyFindings: findings.slice(0, 5),

    reportedIssues: issues.slice(0, 8),

    rootCauseHypotheses: hypotheses.slice(0, 5),

    recommendedActions: recommendations,

    strengths: strengths.slice(0, 5),

    metrics,
  });
}

function buildFallbackRecommendations(
  metrics: ImpactCorrelationMetrics,
  feedbacks: FeedbackContext[],
  issues: ReportedIssue[],
): RecommendedAction[] {
  const recommendations: RecommendedAction[] = [];

  /**
   * Prefer an actual high-severity customer-reported issue.
   */
  const strongestIssue =
    issues.find(
      (issue) => issue.severity === "critical" || issue.severity === "high",
    ) || issues[0];

  if (strongestIssue) {
    recommendations.push({
      rank: 1,

      title: `Review "${truncateText(strongestIssue.issue, 90)}"`,

      area: strongestIssue.topic || "Customer Feedback",

      urgency:
        strongestIssue.severity === "critical" ||
        strongestIssue.severity === "high"
          ? "Immediate"
          : "Soon",

      action:
        `Review the supporting customer feedback and investigate ` +
        `the conditions associated with this reported problem.`,

      reason: strongestIssue.full_period_count
        ? `This issue has the strongest observed frequency in the period.`
        : `This issue appears in ${strongestIssue.evidence_count} reviewed ` +
          `feedback item${strongestIssue.evidence_count === 1 ? "" : "s"}.`,

      expected_effect: `Helps the business understand and address a directly reported customer problem.`,

      evidence_feedback_ids: strongestIssue.evidence_feedback_ids,
    });
  }

  /**
   * If no structured issue exists, use category-level evidence carefully.
   */
  if (
    recommendations.length === 0 &&
    metrics.leading_negative_category &&
    metrics.total_negative > 0
  ) {
    const category = metrics.categories.find(
      (item) => item.category === metrics.leading_negative_category,
    );

    if (category) {
      const evidence = feedbacks
        .filter(
          (feedback) =>
            feedback.categories.includes(category.category) &&
            feedback.sentiment_label.toLowerCase().includes("negative"),
        )
        .map((feedback) => feedback.id)
        .slice(0, 10);

      recommendations.push({
        rank: 1,

        title: `Review negative ${category.category} feedback`,

        area: category.category,

        urgency: category.high_priority_count > 0 ? "Soon" : "Monitor",

        action:
          `Review the specific negative feedback in this category and ` +
          `separate it into concrete customer-reported problems before deciding on remediation.`,

        reason:
          `${category.category} appears in ${category.neg_count} of ` +
          `${metrics.total_negative} negative feedback items ` +
          `(${category.neg_share_percent.toFixed(1)}%).`,

        expected_effect: `Helps identify the specific problems behind the largest currently observed negative category signal.`,

        evidence_feedback_ids: evidence,
      });
    }
  }

  /**
   * Explicit cancellation / escalation feedback.
   */
  const escalationFeedback = feedbacks.filter((feedback) =>
    feedback.intents.some((intent) =>
      /cancel|churn|leave|terminate|escalat/i.test(intent),
    ),
  );

  if (escalationFeedback.length > 0 && recommendations.length < 5) {
    recommendations.push({
      rank: recommendations.length + 1,

      title: "Review explicit escalation signals",

      area: "Customer Feedback",

      urgency: "Immediate",

      action:
        `Review the affected high-priority feedback items and determine ` +
        `the appropriate resolution based on the underlying reported problems.`,

      reason:
        `${escalationFeedback.length} reviewed feedback item` +
        `${escalationFeedback.length === 1 ? "" : "s"} ` +
        `contain explicit cancellation or escalation signals.`,

      expected_effect: `Ensures serious customer concerns receive appropriate attention without assuming a specific remedy.`,

      evidence_feedback_ids: escalationFeedback.map((feedback) => feedback.id),
    });
  }

  /**
   * Feature request signal.
   */
  const requests = feedbacks.filter(
    (feedback) => feedback.requested_capabilities.length > 0,
  );

  if (requests.length > 0 && recommendations.length < 5) {
    recommendations.push({
      rank: recommendations.length + 1,

      title: "Review requested capabilities",

      area: "Requested Capabilities",

      urgency: "Monitor",

      action:
        `Review the explicitly requested capabilities and assess whether ` +
        `similar requests are appearing across customer feedback.`,

      reason:
        `${requests.length} reviewed feedback item` +
        `${requests.length === 1 ? "" : "s"} contain explicit feature or improvement requests.`,

      expected_effect: `Helps product planning reflect customer-requested improvements without assuming demand beyond the observed evidence.`,

      evidence_feedback_ids: requests.map((feedback) => feedback.id),
    });
  }

  return recommendations.slice(0, 5);
}

/* ============================================================
 * FINAL OBJECT ASSEMBLY + BACKWARD COMPATIBILITY
 * ============================================================ */

function assembleExecutiveBrief({
  headline,
  status,
  executiveSummary,
  dataContext,
  keyFindings,
  reportedIssues,
  rootCauseHypotheses,
  recommendedActions,
  strengths,
  metrics,
}: {
  headline: string;

  status: AttentionStatus;

  executiveSummary: string;

  dataContext: DataContext;

  keyFindings: KeyFinding[];

  reportedIssues: ReportedIssue[];

  rootCauseHypotheses: RootCauseHypothesis[];

  recommendedActions: RecommendedAction[];

  strengths: StrengthSignal[];

  metrics: ImpactCorrelationMetrics;
}): Omit<
  ExecutiveBrief,
  "generated_at" | "is_cached" | "period_key" | "period_label"
> {
  const legacyRootCause =
    rootCauseHypotheses.length > 0
      ? rootCauseHypotheses
          .map(
            (hypothesis) =>
              `${hypothesis.hypothesis} (${hypothesis.confidence} confidence)`,
          )
          .join(" ")
      : "No sufficiently supported root-cause hypothesis was identified from the available feedback.";

  const legacyDecisions: StrategicDecision[] = recommendedActions.map(
    (action) => ({
      rank: action.rank,

      title: action.title,

      department_or_area: action.area,

      urgency:
        action.urgency === "Immediate"
          ? "Immediate (24-48h)"
          : action.urgency === "Soon"
            ? "Short-Term (1-2 Weeks)"
            : "Strategic / Policy",

      decision: action.action,

      expected_roi_or_impact:
        action.expected_effect ||
        "Expected effect is qualitative and cannot be quantified from feedback alone.",
    }),
  );

  return {
    headline,

    attention_status: status,

    macro_health_status: status,

    executive_summary: executiveSummary,

    data_context: dataContext,

    key_findings: keyFindings,

    reported_issues: reportedIssues,

    root_cause_hypotheses: rootCauseHypotheses,

    recommended_actions: recommendedActions,

    strengths,

    /**
     * Compatibility layer.
     *
     * All values are deliberately neutral.
     */
    impact_correlation: {
      primary_culprit_category: metrics.leading_negative_category || "None",

      quantified_impact_statement: metrics.observed_signal_statement,

      root_cause_diagnosis: legacyRootCause,
    },

    top_strategic_decisions: legacyDecisions,

    strengths_to_reinforce: strengths.map((strength) => strength.strength),
  };
}

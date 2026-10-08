/**
 * AI analysis types aligned with the classify CX analyst prompt.
 */

export const ANALYSIS_VERSION = "2.1.0";
export const SCHEMA_VERSION = "2.1.0";
export const PROMPT_VERSION = "2.1.0";

export type QualitativeConfidence = "low" | "medium" | "high";
export type SentimentLabel = "Positive" | "Negative" | "Neutral" | "Mixed";
export type PriorityLabel =
  | "Critical Priority"
  | "High Priority"
  | "Medium Priority"
  | "Low Priority";
/** Problem seriousness; null/none when there is no problem. */
export type SeverityLevel = "low" | "medium" | "high" | "critical" | "none";
/** Time sensitivity; null/none when not supported by the text. */
export type UrgencyLevel = "low" | "medium" | "high" | "immediate" | "none";

export interface AspectDetail {
  category: string;
  sentiment: SentimentLabel;
  /** Concise observation of this aspect */
  observation?: string;
  severity: SeverityLevel | string;
  /** Evidence snippet from the customer text */
  evidence?: string;
  /** @deprecated prefer observation + evidence */
  snippet?: string;
}

export interface FeedbackIssue {
  description: string;
  topic?: string;

  severity: "low" | "medium" | "high" | "critical" | "none";

  urgency: "low" | "medium" | "high" | "immediate" | "none";

  evidence: string[];
}

export interface RootCauseHypothesis {
  hypothesis: string;
  confidence: QualitativeConfidence;
  evidence: string[];
}

export interface DeepAnalysisResult {
  category: {
    label: string;
    confidence: QualitativeConfidence;
  };
  categories: string[];
  sentiment: {
    label: SentimentLabel;
    confidence: QualitativeConfidence;
  };
  priority: {
    label: PriorityLabel;
    confidence: QualitativeConfidence;
    reasoning?: {
      impact: string;
      sentiment: string;
    };
  };
  /** Problem seriousness for this feedback; none when no problem */
  severity: SeverityLevel;
  /** Time sensitivity; none when not supported */
  urgency: UrgencyLevel;
  /** Apparent customer intents (open vocabulary) */
  intents: string[];
  /** Broad subjects discussed (open vocabulary, not limited to org categories) */
  topics: string[];
  /** Concrete customer problems, separate from topics */
  issues: FeedbackIssue[];
  /** Explicit requested capabilities / improvements */
  requestedCapabilities: string[];
  /** Specific attributes praised */
  positiveAttributes: string[];
  impact: {
    label: string;
    confidence: QualitativeConfidence;
  };
  scope: {
    label: string;
    confidence: QualitativeConfidence;
  };
  summary: string;
  /** @deprecated use rootCauseHypotheses — retained for read compatibility */
  root_cause?: string;
  rootCauseHypotheses: RootCauseHypothesis[];
  action_items: string[];
  aspects: AspectDetail[];
  analysis_version: string;
  schema_version: string;
  prompt_version: string;
  model_provider: string;
  model_name: string;
}

export function toQualitativeConfidence(value: unknown): QualitativeConfidence {
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "high" || v === "medium" || v === "low") return v;
  }
  if (typeof value === "number") {
    if (value >= 0.8) return "high";
    if (value >= 0.5) return "medium";
    return "low";
  }
  return "medium";
}

export function normalizeSeverityLevel(value: unknown): SeverityLevel {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    !raw ||
    raw === "null" ||
    raw === "n/a" ||
    raw === "na" ||
    raw === "none"
  ) {
    return "none";
  }
  if (raw.includes("crit")) return "critical";
  if (raw.includes("high") || raw === "moderate") return "high";
  if (raw.includes("med")) return "medium";
  if (raw.includes("low") || raw.includes("minor")) return "low";
  return "none";
}

export function normalizeUrgencyLevel(value: unknown): UrgencyLevel {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    !raw ||
    raw === "null" ||
    raw === "n/a" ||
    raw === "na" ||
    raw === "none"
  ) {
    return "none";
  }
  if (raw.includes("imm")) return "immediate";
  if (raw.includes("high") || raw.includes("urg")) return "high";
  if (raw.includes("med")) return "medium";
  if (raw.includes("low")) return "low";
  return "none";
}

export function normalizePriorityLabel(value: unknown): PriorityLabel {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw.includes("crit")) return "Critical Priority";
  if (raw.includes("high")) return "High Priority";
  if (raw.includes("low")) return "Low Priority";
  if (raw.includes("med")) return "Medium Priority";
  return "Medium Priority";
}

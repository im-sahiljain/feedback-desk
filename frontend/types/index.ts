import { INDUSTRY_CATEGORY_CATALOG } from "@/lib/industryCatalog";

export type Industry =
  | "tech"
  | "healthcare"
  | "infrastructure"
  | "custom"
  | string;

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";

export type Priority = "low" | "medium" | "high";

export interface AspectDetail {
  category: string;
  sentiment: string;
  severity: string;
  snippet: string;
}

export interface RootCauseHypothesis {
  hypothesis: string;
  confidence: string;
  evidence: string[];
}

export interface AIAnalysis {
  sentiment: Sentiment;
  category: string;
  categories?: string[];
  priority: Priority;
  summary: string;
  aspects?: AspectDetail[];
  actionItems?: string[];
  /** @deprecated prefer rootCauseHypotheses — first hypothesis text for compat */
  rootCause?: string;
  rootCauseHypotheses?: RootCauseHypothesis[];
}

export interface Feedback {
  id: string;
  productId: string;
  text: string;
  rating?: number;
  email?: string;
  createdAt: Date;
  categories?: string[];
  category?: string;
  sentiment?: Sentiment | string;
  impact?: string;
  status?: string;
  processing_status?: string;
  analysis?: AIAnalysis;
  isAnalyzing?: boolean;
}

export interface BackendRawAiMetadata {
  sentiment?: { label?: string; score?: number } | string;
  category?: { label?: string; score?: number } | string;
  categories?: string[];
  priority?: { label?: string; score?: number } | string;
  confidence?: number;
  summary?: string;
  executiveSummary?: string;
  aspects?: AspectDetail[];
  action_items?: string[];
  root_cause?: string;
  rootCauseHypotheses?: RootCauseHypothesis[];
  impact?: string;
}

export interface BackendFeedback {
  id?: string | number;
  product_id?: string | number;
  feedback?: string;
  email?: string | null;
  rating?: string | number | null;
  created_at?: string | Date;
  categories?: string[];
  category_name?: string;
  sentiment_label?: string;
  priority_label?: string;
  confidence?: number;
  raw_ai_metadata?: BackendRawAiMetadata;
  status?: string;
  processing_status?: string;
  impact?: string;
  sentiment?: { label?: string; score?: number } | string;
  category?: { label?: string; score?: number } | string;
  priority?: { label?: string; score?: number } | string;
  analysis?: AIAnalysis | BackendRawAiMetadata;
}

export interface ProductConfig {
  categories: string[];
  aiPrompt?: string;
  focusAreas?: string[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  industry: Industry;
  config?: ProductConfig;
  settings?: any; // To support API response
  createdAt?: Date; // API might not return this immediately in list
  created_at?: Date;
  public_feedback_token?: string | null;
  public_feedback_path?: string | null;
}

export interface InsightStats {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  highPriorityCount: number;
  averageRating: number;
}

export interface CategoryCorrelation {
  category: string;
  total_count: number;
  neg_count: number;
  pos_count: number;
  high_priority_count: number;
  neg_share_percent: number;
  high_priority_share_percent: number;
}

export interface ImpactCorrelationMetrics {
  total_feedback: number;
  total_negative: number;
  total_positive: number;
  total_neutral: number;
  total_mixed?: number;
  total_high_priority: number;
  total_medium_priority?: number;
  total_low_priority?: number;
  average_rating: number;
  primary_culprit_category: string;
  primary_culprit_neg_share: number;
  primary_culprit_high_priority_share: number;
  quantified_impact_statement: string;
  categories: CategoryCorrelation[];
  period_key?: string;
  period_label?: string;
  chart_snapshot?: {
    sentiment: Array<{ name: string; value: number }>;
    priority: Array<{ name: string; value: number }>;
    trend: Array<{ day: string; total: number; positive: number }>;
    top_issues: Array<{
      text: string;
      category: string;
      rating: number | null;
    }>;
  };
}

export interface StrategicDecision {
  rank: number;
  title: string;
  department_or_area: string;
  urgency:
    | "Immediate (24-48h)"
    | "Short-Term (1-2 Weeks)"
    | "Strategic / Policy";
  decision: string;
  expected_roi_or_impact: string;
}

export interface ExecutiveBrief {
  headline: string;
  macro_health_status:
    | "Critical Alert"
    | "Action Required"
    | "Stable"
    | "Healthy";
  executive_summary: string;
  impact_correlation: {
    primary_culprit_category: string;
    quantified_impact_statement: string;
    root_cause_diagnosis: string;
  };
  top_strategic_decisions: StrategicDecision[];
  strengths_to_reinforce: string[];
  period_key?: string;
  period_label?: string;
  generated_at: string;
  is_cached: boolean;
  window_start?: string | null;
  window_end?: string | null;
  is_stale?: boolean;
}

export type DashboardPeriod = "7d" | "30d" | "90d";

export interface DashboardChangeDelta {
  absolute: number;
  percent: number | null;
  display: string;
  direction: "up" | "down" | "flat" | "new";
  meaningful: boolean;
  smallSample: boolean;
}

export interface DashboardSummary {
  period: {
    key: DashboardPeriod;
    label: string;
    from: string;
    to: string;
    comparisonFrom: string;
    comparisonTo: string;
    comparisonLabel: string;
  };
  summary: {
    feedbackCount: number;
    feedbackCountChange: DashboardChangeDelta;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      mixed: number;
      analyzed: number;
      positivePct: number | null;
      negativePct: number | null;
      mixedPct: number | null;
      neutralPct: number | null;
      direction: "improving" | "worsening" | "stable" | "insufficient";
    };
    negativeChange: DashboardChangeDelta;
    needsAttention: {
      total: number;
      highPriority: number;
      failedOrNeedsReview: number;
    };
    processing: {
      received: number;
      analyzed: number;
      processing: number;
      failed: number;
      pending: number;
    };
  };
  attention: Array<{
    category: string;
    feedbackCount: number;
    negativeCount: number;
    highPriorityCount: number;
    change: DashboardChangeDelta;
    severity: "high" | "medium" | "watch";
    signal: string | null;
    evidenceFeedbackId: string | null;
    evidenceDateKey: string | null;
  }>;
  changes: Array<{
    id: string;
    direction: "up" | "down";
    label: string;
    detail: string;
    category?: string;
    change: DashboardChangeDelta;
  }>;
  topAreas: Array<{
    category: string;
    feedbackCount: number;
    negativeCount: number;
    highPriorityCount: number;
    positiveCount: number;
    change: DashboardChangeDelta;
    signal: "worsening" | "improving" | "stable" | "watch" | "high_priority";
  }>;
  positiveSignals: Array<{
    category: string;
    positiveCount: number;
    change: DashboardChangeDelta;
  }>;
  sentimentTrend: Array<{
    bucket: string;
    label: string;
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
    total: number;
  }>;
  criticalFeedback: Array<{
    id: string;
    text: string;
    sentiment: string | null;
    priority: string | null;
    category: string | null;
    createdAt: string;
    processingStatus: string | null;
    summary: string | null;
  }>;
  brief: {
    available: boolean;
    headline: string | null;
    whatIsHappening: string | null;
    whyItMatters: string | null;
    recommendedFocus: string | null;
    healthStatus: string | null;
    generatedAt: string | null;
    supportingCategory: string | null;
  } | null;
}

export const INDUSTRY_LABELS: Record<Industry, string> = {
  Technology: "Technology",
  Healthcare: "Healthcare",
  Infrastructure: "Infrastructure",
  Education: "Education",
  Retail: "Retail",
  Hospitality: "Hospitality",
  Custom: "Custom",
};

export const INDUSTRY_ICONS: Record<Industry, string> = {
  Technology: "💻",
  Healthcare: "🏥",
  Infrastructure: "🏗️",
  Education: "🎓",
  Retail: "🛒",
  Hospitality: "🏨",
  Custom: "⚙️",
};

/** Default category suggestions per industry (synced with backend Industry_Master_Labels.json). */
export const DEFAULT_CATEGORIES: Record<string, string[]> = {
  ...INDUSTRY_CATEGORY_CATALOG,
  Custom: ["General", "Suggestion", "Complaint", "Praise", "Question"],
  // Legacy keys kept for older product rows / settings fallbacks
  tech: INDUSTRY_CATEGORY_CATALOG.Technology,
  healthcare: INDUSTRY_CATEGORY_CATALOG.Healthcare,
  infrastructure: INDUSTRY_CATEGORY_CATALOG.Infrastructure,
  custom: ["General", "Suggestion", "Complaint", "Praise", "Question"],
};

export const DEFAULT_AI_PROMPTS: Record<string, string> = {
  Technology:
    "Analyze feedback focusing on technical issues, software bugs, performance problems, and feature suggestions. Prioritize security and critical bugs.",
  Healthcare:
    "Analyze feedback focusing on patient experience, staff interactions, facility conditions, and treatment quality. Prioritize patient safety concerns.",
  Infrastructure:
    "Analyze feedback focusing on construction quality, safety compliance, project timelines, and environmental impact. Prioritize safety issues.",
  Education:
    "Analyze feedback focusing on teaching quality, curriculum, facilities, and student support. Prioritize learning outcomes and safety.",
  Retail:
    "Analyze feedback focusing on product quality, delivery, payments, and customer service. Prioritize fulfillment and refund issues.",
  Hospitality:
    "Analyze feedback focusing on staff behavior, cleanliness, room quality, and guest experience. Prioritize safety and service failures.",
  Custom:
    "Analyze feedback and categorize based on sentiment, urgency, and actionability. Focus on identifying actionable insights.",
  tech: "Analyze feedback focusing on technical issues, software bugs, performance problems, and feature suggestions. Prioritize security and critical bugs.",
  healthcare:
    "Analyze feedback focusing on patient experience, staff interactions, facility conditions, and treatment quality. Prioritize patient safety concerns.",
  infrastructure:
    "Analyze feedback focusing on construction quality, safety compliance, project timelines, and environmental impact. Prioritize safety issues.",
  custom:
    "Analyze feedback and categorize based on sentiment, urgency, and actionability. Focus on identifying actionable insights.",
};

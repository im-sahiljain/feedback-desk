/**
 * AI analysis types with hypothesis semantics and qualitative confidence.
 */

export const ANALYSIS_VERSION = '2.0.0';
export const SCHEMA_VERSION = '2.0.0';
export const PROMPT_VERSION = '2.0.0';

export type QualitativeConfidence = 'low' | 'medium' | 'high';
export type SentimentLabel = 'Positive' | 'Negative' | 'Neutral' | 'Mixed';

export interface AspectDetail {
  category: string;
  sentiment: SentimentLabel;
  severity: 'Critical' | 'Moderate' | 'Minor' | 'None';
  snippet: string;
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
    label: 'High Priority' | 'Medium Priority' | 'Low Priority';
    confidence: QualitativeConfidence;
    reasoning?: {
      impact: string;
      sentiment: string;
    };
  };
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
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if (v === 'high' || v === 'medium' || v === 'low') return v;
  }
  if (typeof value === 'number') {
    if (value >= 0.8) return 'high';
    if (value >= 0.5) return 'medium';
    return 'low';
  }
  return 'medium';
}

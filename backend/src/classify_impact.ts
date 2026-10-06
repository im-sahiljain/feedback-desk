/**
 * Re-export AI classifier from the production AI module.
 * Kept so existing imports of classify_impact continue to work.
 */
export {
  classifyImpactSingle,
  ANALYSIS_VERSION,
  SCHEMA_VERSION,
  PROMPT_VERSION,
} from './ai/classify.js';
export type { DeepAnalysisResult, AspectDetail, RootCauseHypothesis } from './ai/types.js';

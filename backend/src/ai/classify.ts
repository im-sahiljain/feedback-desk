import { GoogleGenAI, Type } from '@google/genai';
import { getConfig } from '../config/env.js';
import { sanitizeForAi } from './sanitize.js';
import {
  ANALYSIS_VERSION,
  SCHEMA_VERSION,
  PROMPT_VERSION,
  DeepAnalysisResult,
  AspectDetail,
  RootCauseHypothesis,
  SentimentLabel,
  toQualitativeConfidence,
  QualitativeConfidence,
} from './types.js';
import { logger } from '../logging/logger.js';

export type { DeepAnalysisResult, AspectDetail, RootCauseHypothesis } from './types.js';
export { ANALYSIS_VERSION, SCHEMA_VERSION, PROMPT_VERSION } from './types.js';

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Classify feedback asynchronously-safe. Callers must persist original text first.
 * Only sanitized text is sent to the AI provider.
 */
export async function classifyImpactSingle(
  text: string,
  activeLabels: string[] = []
): Promise<DeepAnalysisResult> {
  if (!text || text.trim() === '') {
    throw new Error('Invalid input: text is required.');
  }

  const availableLabels =
    activeLabels.length > 0
      ? activeLabels
      : ['Bug Report', 'Performance Issue', 'UI/UX', 'Feature Request', 'Customer Support', 'Security'];

  const { sanitized, redactions } = sanitizeForAi(text);
  if (redactions.length > 0) {
    logger.info('PII redacted before AI call', { redactionTypes: redactions });
  }

  const apiKey = getConfig().geminiApiKey;
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set; using heuristic analysis');
    return generateFallbackDeepAnalysis(sanitized, availableLabels);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a Product Feedback Intelligence analyst.
Analyze the following customer feedback. Treat conclusions as hypotheses supported only by the provided text.

Available Product Categories:
[${availableLabels.join(', ')}]

Customer Feedback (PII-minimized):
"${sanitized}"

Rules:
1. Multi-label: identify ALL relevant categories from the available list.
2. Primary category: the single most dominant category.
3. Sentiment: Positive, Negative, Neutral, or Mixed.
4. Priority: High Priority, Medium Priority, or Low Priority.
5. Aspect breakdown: category, sentiment, severity, short evidence snippet from the feedback.
6. Action items: 1-3 qualitative recommendations (no invented ROI, churn %, revenue, or monetary impact).
7. Root-cause hypotheses: propose 1-3 HYPOTHESES only. Each must include confidence (low|medium|high) and evidence snippets from the feedback. Do NOT claim a cause is confirmed.
8. Do not invent internal systems, customer counts, financial outcomes, or facts not present in the feedback.
9. Confidence values must be qualitative: low, medium, or high — never fabricated numeric precision.`;

    const started = Date.now();
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryCategory: { type: Type.STRING },
            primaryCategoryConfidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            matchedCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
            overallSentiment: {
              type: Type.STRING,
              enum: ['Positive', 'Negative', 'Neutral', 'Mixed'],
            },
            sentimentConfidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            priority: {
              type: Type.STRING,
              enum: ['High Priority', 'Medium Priority', 'Low Priority'],
            },
            priorityConfidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            impactSeverity: { type: Type.STRING },
            impactScope: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            rootCauseHypotheses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hypothesis: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['hypothesis', 'confidence', 'evidence'],
              },
            },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            aspects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  sentiment: {
                    type: Type.STRING,
                    enum: ['Positive', 'Negative', 'Neutral', 'Mixed'],
                  },
                  severity: {
                    type: Type.STRING,
                    enum: ['Critical', 'Moderate', 'Minor', 'None'],
                  },
                  snippet: { type: Type.STRING },
                },
                required: ['category', 'sentiment', 'severity', 'snippet'],
              },
            },
          },
          required: [
            'primaryCategory',
            'matchedCategories',
            'overallSentiment',
            'priority',
            'executiveSummary',
            'actionItems',
            'rootCauseHypotheses',
          ],
        },
      },
    });

    const latency = Date.now() - started;
    const rawJson = response.text || '{}';
    const parsed = JSON.parse(rawJson);

    const primaryCat = availableLabels.includes(parsed.primaryCategory)
      ? parsed.primaryCategory
      : availableLabels[0] || 'General';

    const matchedCats: string[] =
      Array.isArray(parsed.matchedCategories) && parsed.matchedCategories.length > 0
        ? parsed.matchedCategories.filter((c: string) => availableLabels.includes(c))
        : [primaryCat];
    if (!matchedCats.includes(primaryCat)) matchedCats.unshift(primaryCat);

    const sentimentLabel = normalizeSentimentLabel(parsed.overallSentiment);
    const priorityLabel = (parsed.priority || 'Medium Priority') as DeepAnalysisResult['priority']['label'];

    const hypotheses: RootCauseHypothesis[] = Array.isArray(parsed.rootCauseHypotheses)
      ? parsed.rootCauseHypotheses.map((h: { hypothesis?: string; confidence?: string; evidence?: string[] }) => ({
          hypothesis: String(h.hypothesis || '').slice(0, 500),
          confidence: toQualitativeConfidence(h.confidence),
          evidence: Array.isArray(h.evidence) ? h.evidence.map(String).slice(0, 5) : [],
        }))
      : [];

    const aspects: AspectDetail[] = Array.isArray(parsed.aspects) ? parsed.aspects : [];
    const actionItems: string[] = Array.isArray(parsed.actionItems)
      ? parsed.actionItems.map((a: string) => stripBusinessClaims(String(a)))
      : [];

    const result: DeepAnalysisResult = {
      category: {
        label: primaryCat,
        confidence: toQualitativeConfidence(parsed.primaryCategoryConfidence),
      },
      categories: matchedCats,
      sentiment: {
        label: sentimentLabel,
        confidence: toQualitativeConfidence(parsed.sentimentConfidence),
      },
      priority: {
        label: priorityLabel,
        confidence: toQualitativeConfidence(parsed.priorityConfidence),
        reasoning: {
          impact: parsed.impactSeverity || 'Assessed from feedback content',
          sentiment: sentimentLabel,
        },
      },
      impact: {
        label: parsed.impactSeverity || 'Unknown',
        confidence: 'medium',
      },
      scope: {
        label: parsed.impactScope || 'Not quantifiable from feedback alone',
        confidence: 'low',
      },
      summary: String(parsed.executiveSummary || '').slice(0, 500),
      rootCauseHypotheses: hypotheses,
      root_cause: hypotheses[0]?.hypothesis,
      action_items: actionItems,
      aspects,
      analysis_version: ANALYSIS_VERSION,
      schema_version: SCHEMA_VERSION,
      prompt_version: PROMPT_VERSION,
      model_provider: 'google',
      model_name: MODEL_NAME,
    };

    logger.info('AI analysis completed', {
      provider: 'google',
      model: MODEL_NAME,
      latencyMs: latency,
      analysisVersion: ANALYSIS_VERSION,
    });

    return result;
  } catch (error) {
    logger.error('Gemini classification failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return generateFallbackDeepAnalysis(sanitized, availableLabels);
  }
}

function normalizeSentimentLabel(value: unknown): SentimentLabel {
  const raw = String(value || 'Neutral');
  if (/mixed/i.test(raw)) return 'Mixed';
  if (/pos/i.test(raw)) return 'Positive';
  if (/neg/i.test(raw)) return 'Negative';
  return 'Neutral';
}

function stripBusinessClaims(text: string): string {
  return text
    .replace(/reduces?\s+churn\s+by\s+~?\d+%/gi, 'may help retain customers (impact not quantifiable from feedback alone)')
    .replace(/increase[sd]?\s+revenue\s+by\s+~?\d+%/gi, 'may improve outcomes (impact not quantifiable)')
    .replace(/save[sd]?\s+~?\d+%/gi, 'may reduce friction (impact not quantifiable)')
    .replace(/ROI\s+of\s+~?\d+%/gi, 'qualitative operational benefit')
    .replace(/estimated\s+ROI[^.]*\./gi, 'Impact is not quantifiable from feedback alone.');
}

function generateFallbackDeepAnalysis(text: string, availableLabels: string[]): DeepAnalysisResult {
  const lower = text.toLowerCase();
  const isNegative =
    /bug|error|fail|broken|slow|crash|issue|problem/.test(lower);
  const isPositive = /great|good|love|awesome|excellent|thank/.test(lower);
  const sentimentLabel: SentimentLabel =
    isNegative && isPositive ? 'Mixed' : isNegative ? 'Negative' : isPositive ? 'Positive' : 'Neutral';
  const priorityLabel: DeepAnalysisResult['priority']['label'] = isNegative
    ? 'High Priority'
    : 'Low Priority';

  const matchedCats = availableLabels.filter((lbl) => lower.includes(lbl.toLowerCase()));
  if (matchedCats.length === 0) matchedCats.push(availableLabels[0] || 'General');
  const primaryCat = matchedCats[0];

  const hypotheses: RootCauseHypothesis[] = isNegative
    ? [
        {
          hypothesis: 'There may be a product or process issue reflected in the customer description.',
          confidence: 'low' as QualitativeConfidence,
          evidence: [text.slice(0, 120)],
        },
      ]
    : [];

  return {
    category: { label: primaryCat, confidence: 'low' },
    categories: matchedCats,
    sentiment: { label: sentimentLabel, confidence: 'low' },
    priority: {
      label: priorityLabel,
      confidence: 'low',
      reasoning: { impact: 'Heuristic only', sentiment: sentimentLabel },
    },
    impact: { label: 'Unknown', confidence: 'low' },
    scope: { label: 'Not quantifiable from feedback alone', confidence: 'low' },
    summary: text.slice(0, 100),
    rootCauseHypotheses: hypotheses,
    root_cause: hypotheses[0]?.hypothesis,
    action_items: [
      isNegative
        ? 'Review the reported experience with the relevant product team'
        : 'Acknowledge positive customer feedback',
    ],
    aspects: [
      {
        category: primaryCat,
        sentiment: sentimentLabel,
        severity: isNegative ? 'Moderate' : 'None',
        snippet: text.slice(0, 50),
      },
    ],
    analysis_version: ANALYSIS_VERSION,
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,
    model_provider: 'fallback',
    model_name: 'heuristic',
  };
}

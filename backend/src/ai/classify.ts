import { GoogleGenAI, Type } from "@google/genai";

import { getConfig } from "../config/env.js";
import { logger } from "../logging/logger.js";

import { sanitizeForAi } from "./sanitize.js";

import {
  ANALYSIS_VERSION,
  SCHEMA_VERSION,
  PROMPT_VERSION,
  DeepAnalysisResult,
  AspectDetail,
  FeedbackIssue,
  RootCauseHypothesis,
  SentimentLabel,
  toQualitativeConfidence,
  normalizeSeverityLevel,
  normalizeUrgencyLevel,
  normalizePriorityLabel,
} from "./types.js";

export type {
  DeepAnalysisResult,
  AspectDetail,
  FeedbackIssue,
  RootCauseHypothesis,
} from "./types.js";

export { ANALYSIS_VERSION, SCHEMA_VERSION, PROMPT_VERSION } from "./types.js";

const MODEL_NAME = "gemini-3.5-flash-lite";

/**
 * Individual-feedback analysis contract
 * -------------------------------------
 * This module analyzes ONE feedback record only.
 *
 * Principles:
 * - Understand meaning before category matching.
 * - Configured categories never limit semantic understanding.
 * - Topics and issues remain valid even when category = Uncategorized.
 * - No aggregate/trend/customer-count claims from one record.
 * - Root-cause hypotheses are optional and require explicit causal evidence.
 * - Severity, urgency and priority are separate concepts.
 * - Evidence must be traceable to the supplied feedback text.
 * - No industry-specific hardcoded reasoning.
 */

function asStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    )
    .map((item) => item.trim().slice(0, 160))
    .slice(0, max);
}

function uniqueStrings(values: string[], max = 20): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, max);
}

function normalizeSentimentLabel(value: unknown): SentimentLabel {
  const raw = String(value || "Neutral");

  if (/mixed/i.test(raw)) return "Mixed";
  if (/pos/i.test(raw)) return "Positive";
  if (/neg/i.test(raw)) return "Negative";

  return "Neutral";
}

function normalizeComparableText(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ingly|edly|ation|ments|ment|ness|ingly|ing|ed|es|s)$/i, "")
    .trim();
}

const GROUNDING_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "between",
  "could",
  "customer",
  "feedback",
  "from",
  "have",
  "into",
  "issue",
  "likely",
  "might",
  "more",
  "possible",
  "possibly",
  "problem",
  "reported",
  "seems",
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

function extractGroundingTokens(text: string): Set<string> {
  const tokens = String(text || "")
    .split(/[^a-z0-9]+/i)
    .map(normalizeToken)
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
 * Conservative semantic/lexical grounding safety net.
 *
 * This is deliberately industry-agnostic. It does not ban words such as
 * "database", "staffing", "insurance", "delivery", etc. Those concepts are
 * valid when the customer actually supplied them.
 */
function claimIsGroundedInEvidence(
  claim: string,
  evidenceText: string,
  minimumRatio = 0.3,
): boolean {
  const claimTokens = extractGroundingTokens(claim);
  const evidenceTokens = extractGroundingTokens(evidenceText);

  if (claimTokens.size === 0 || evidenceTokens.size === 0) {
    return false;
  }

  const substantive = Array.from(claimTokens);
  const groundedCount = substantive.filter((token) =>
    tokenIsGrounded(token, evidenceTokens),
  ).length;

  const minimumAnchors = substantive.length >= 8 ? 2 : 1;

  if (groundedCount < minimumAnchors) {
    return false;
  }

  if (substantive.length <= 3) {
    return true;
  }

  return groundedCount / substantive.length >= minimumRatio;
}

/**
 * Evidence snippets returned by the model must actually come from, or be a very
 * close paraphrase of, the supplied feedback.
 */
function evidenceSnippetIsTraceable(
  snippet: string,
  sourceText: string,
): boolean {
  const snippetText = normalizeComparableText(snippet);
  const source = normalizeComparableText(sourceText);

  if (!snippetText || !source) {
    return false;
  }

  if (source.includes(snippetText)) {
    return true;
  }

  return claimIsGroundedInEvidence(snippetText, source, 0.55);
}

/**
 * A root-cause hypothesis requires evidence that explains WHY.
 *
 * This intentionally prefers false negatives over fabricated causes.
 * If explicit causal evidence is not present, the issue remains an issue and
 * rootCauseHypotheses should be [].
 */
function evidenceContainsExplicitCausalSignal(evidence: string): boolean {
  const text = normalizeComparableText(evidence);

  if (!text) return false;

  return (
    /\bbecause\b/.test(text) ||
    /\bdue to\b/.test(text) ||
    /\bcaused by\b/.test(text) ||
    /\bcauses?\b/.test(text) ||
    /\bresult(?:ed|s|ing)? from\b/.test(text) ||
    /\bthe reason\b/.test(text) ||
    /\bstems? from\b/.test(text) ||
    /\bowing to\b/.test(text) ||
    /\btriggered by\b/.test(text) ||
    /\bleads? to\b/.test(text) ||
    /\bled to\b/.test(text) ||
    /\battributed to\b/.test(text)
  );
}

function normalizeRootCauseHypotheses(
  value: unknown,
  sourceText: string,
): RootCauseHypothesis[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const source = String(sourceText || "");

  return value
    .map((item: any) => {
      const hypothesis = String(item?.hypothesis || "")
        .trim()
        .slice(0, 500);

      const evidence = Array.isArray(item?.evidence)
        ? item.evidence
            .map(String)
            .map((entry: string) => entry.trim().slice(0, 300))
            .filter(Boolean)
            .filter((entry: string) =>
              evidenceSnippetIsTraceable(entry, source),
            )
            .slice(0, 5)
        : [];

      if (!hypothesis || evidence.length === 0) {
        return null;
      }

      const combinedEvidence = evidence.join(" ");

      // The evidence itself must contain an explicit causal relationship.
      if (!evidence.some(evidenceContainsExplicitCausalSignal)) {
        return null;
      }

      // The proposed explanation must remain grounded in the cited evidence.
      if (!claimIsGroundedInEvidence(hypothesis, combinedEvidence, 0.45)) {
        return null;
      }

      return {
        hypothesis,
        confidence: toQualitativeConfidence(item?.confidence),
        evidence,
      } satisfies RootCauseHypothesis;
    })
    .filter(
      (item: RootCauseHypothesis | null): item is RootCauseHypothesis =>
        item !== null,
    )
    .slice(0, 3);
}

function normalizeIssues(value: unknown, sourceText: string): FeedbackIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item: any) =>
        item &&
        typeof item.description === "string" &&
        item.description.trim().length > 0,
    )
    .map((item: any) => {
      const evidence = Array.isArray(item.evidence)
        ? item.evidence
            .map(String)
            .map((entry: string) => entry.trim().slice(0, 300))
            .filter(Boolean)
            .filter((entry: string) =>
              evidenceSnippetIsTraceable(entry, sourceText),
            )
            .slice(0, 5)
        : [];

      return {
        description: String(item.description).trim().slice(0, 400),

        topic: item.topic ? String(item.topic).trim().slice(0, 120) : undefined,

        severity: normalizeSeverityLevel(item.severity),

        urgency: normalizeUrgencyLevel(item.urgency),

        evidence,
      };
    })
    .slice(0, 8);
}

function normalizeAspects(value: unknown, sourceText: string): AspectDetail[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const results: AspectDetail[] = [];

  for (const item of value) {
    const observation = String(item?.observation || item?.snippet || "")
      .trim()
      .slice(0, 500);

    if (!observation) {
      continue;
    }

    const candidateEvidence = String(item?.evidence || item?.snippet || "")
      .trim()
      .slice(0, 300);

    const evidence =
      candidateEvidence &&
      evidenceSnippetIsTraceable(candidateEvidence, sourceText)
        ? candidateEvidence
        : "";

    results.push({
      category: String(item?.category || "General")
        .trim()
        .slice(0, 120),

      sentiment: normalizeSentimentLabel(item?.sentiment),

      observation,

      severity: normalizeSeverityLevel(item?.severity),

      evidence,

      snippet: evidence || observation,
    });
  }

  return results.slice(0, 8);
}

function normalizePositiveAttributes(
  value: unknown,
  sourceText: string,
): string[] {
  const attributes = asStringList(value, 8);

  return uniqueStrings(
    attributes.filter((attribute) =>
      claimIsGroundedInEvidence(attribute, sourceText, 0.25),
    ),
    5,
  );
}

function stripBusinessClaims(text: string): string {
  return String(text || "")
    .replace(
      /reduces?\s+churn\s+by\s+~?\d+(\.\d+)?%/gi,
      "may address the reported concern (impact not quantifiable from this feedback alone)",
    )
    .replace(
      /increase[sd]?\s+revenue\s+by\s+~?\d+(\.\d+)?%/gi,
      "may improve the reported experience (impact not quantifiable from this feedback alone)",
    )
    .replace(
      /save[sd]?\s+~?\d+(\.\d+)?%/gi,
      "may reduce the reported friction (impact not quantifiable from this feedback alone)",
    )
    .replace(/ROI\s+(?:of\s+)?~?\d+(\.\d+)?%/gi, "qualitative benefit only")
    .replace(
      /estimated\s+ROI[^.]*\./gi,
      "Impact is not quantifiable from this feedback alone.",
    )
    .trim();
}

function hasTraceableIssueEvidence(issues: FeedbackIssue[]): boolean {
  return issues.some(
    (issue) => Array.isArray(issue.evidence) && issue.evidence.length > 0,
  );
}

function normalizeOverallSeverity(
  rawSeverity: unknown,
  issues: FeedbackIssue[],
  aspects: AspectDetail[],
): ReturnType<typeof normalizeSeverityLevel> {
  let severity = normalizeSeverityLevel(rawSeverity);

  const hasIssueEvidence = hasTraceableIssueEvidence(issues);
  const hasAspectEvidence = aspects.some(
    (aspect) => Boolean(aspect.evidence) && aspect.severity !== "none",
  );

  /**
   * High / critical conclusions need traceable problem evidence.
   * If the model cannot cite any supporting text, cap the result at medium.
   */
  if (
    (severity === "high" || severity === "critical") &&
    !hasIssueEvidence &&
    !hasAspectEvidence
  ) {
    severity = "medium";
  }

  return severity;
}

function normalizeOverallUrgency(
  rawUrgency: unknown,
  severity: ReturnType<typeof normalizeSeverityLevel>,
): ReturnType<typeof normalizeUrgencyLevel> {
  let urgency = normalizeUrgencyLevel(rawUrgency);

  if (severity === "none") {
    urgency = "none";
  }

  return urgency;
}

function normalizeOverallPriority(
  rawPriority: unknown,
  severity: ReturnType<typeof normalizeSeverityLevel>,
  urgency: ReturnType<typeof normalizeUrgencyLevel>,
): ReturnType<typeof normalizePriorityLabel> {
  let priority = normalizePriorityLabel(rawPriority);

  /**
   * Keep the three dimensions logically coherent without trying to infer
   * domain-specific business rules.
   */
  if (severity === "none" && urgency === "none") {
    if (/critical|high/i.test(String(priority))) {
      priority = "Low Priority";
    }
  }

  if (severity === "critical" && priority === "Low Priority") {
    priority = "High Priority";
  }

  if (urgency === "immediate" && priority === "Low Priority") {
    priority = "High Priority";
  }

  return priority;
}

/**
 * Classify feedback asynchronously-safe.
 * Callers must persist original text first.
 * Only sanitized text is sent to the AI provider.
 */
export async function classifyImpactSingle(
  text: string,
  activeLabels: string[] = [],
): Promise<DeepAnalysisResult> {
  if (!text || text.trim() === "") {
    throw new Error("Invalid input: text is required.");
  }

  /**
   * Do not silently inject SaaS/product categories for organizations that did
   * not configure them. Semantic understanding is independent of categories.
   */
  const availableLabels = uniqueStrings(
    activeLabels.filter(
      (label) =>
        typeof label === "string" &&
        label.trim().length > 0 &&
        label.trim() !== "Uncategorized",
    ),
    100,
  );

  const { sanitized, redactions } = sanitizeForAi(text);

  if (redactions.length > 0) {
    logger.info("PII redacted before AI call", {
      redactionTypes: redactions,
    });
  }

  const apiKey = getConfig().geminiApiKey;

  if (!apiKey) {
    logger.warn("GEMINI_API_KEY not set; using heuristic analysis");

    return generateFallbackDeepAnalysis(sanitized, availableLabels);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an AI Customer Feedback Intelligence analyst.

You are analyzing ONE customer feedback record.

Your task is to understand what the feedback actually says and convert it into
structured, evidence-backed customer intelligence.

The feedback can come from ANY industry, business model, product, service,
organization, geography, or customer context.

Industry stereotypes, fixed taxonomies, and common business assumptions must
NOT be used as evidence.

==================================================
CUSTOMER FEEDBACK
==================================================

"""
${sanitized}
"""

==================================================
CONFIGURED BUSINESS CATEGORIES
==================================================

${
  availableLabels.length > 0
    ? `[${availableLabels.join(", ")}]`
    : "No configured categories were supplied."
}

Configured categories are organization-defined reporting labels.

They are ONLY used after semantic understanding.

They must never limit:
- topics
- issues
- praise
- requests
- sentiment
- severity
- urgency
- priority
- evidence

If no configured category clearly fits, use exactly:
primaryCategory = "Uncategorized"
matchedCategories = ["Uncategorized"]

Do not invent a configured category.

==================================================
NON-NEGOTIABLE REASONING CONTRACT
==================================================

1. SOURCE-ONLY REASONING

Use only the supplied feedback text.

Do not add:
- unseen facts
- unseen mechanisms
- unseen systems
- unseen processes
- unseen departments
- unseen people
- unseen transactions
- unseen customer history
- external knowledge presented as fact
- business outcomes not contained in the feedback

2. SINGLE-RECORD SCOPE

This is ONE feedback record.

Never claim:
- many customers
- recurring issue
- trend
- increase/decrease over time
- most requested
- common complaint
- widespread problem
- aggregate business impact
- revenue effect
- churn effect

Those require aggregate analysis.

3. UNDERSTAND BEFORE CATEGORIZING

First understand the feedback.

Then extract:
- intent
- sentiment
- topics
- concrete issues
- praise
- explicit requests
- severity
- urgency
- priority

Only then map the feedback to configured business categories.

4. TOPIC IS NOT ISSUE

Topic = broad subject.

Issue = concrete customer-reported problem.

An issue should describe WHAT happened from the customer's perspective,
without inventing WHY it happened.

5. EVIDENCE

Important conclusions must be traceable to the supplied feedback.

Evidence snippets must be exact short excerpts or very close paraphrases of
text that actually appears in this feedback.

Do not manufacture evidence.

6. ROOT CAUSE

Root-cause hypotheses are OPTIONAL and should be RARE.

A negative symptom is not a root cause.
A trigger is not automatically a root cause.
Two things appearing together are not automatically causally related.
Sequence is not causation.

Only return a root-cause hypothesis when the customer's own wording explicitly
provides causal evidence explaining WHY something happened.

The evidence field for a root-cause hypothesis must quote or closely paraphrase
the causal statement itself.

If the customer only describes WHAT happened, return:
rootCauseHypotheses = []

Do not reward plausibility.
Reward explicit causal evidence.

7. SEVERITY

Severity describes seriousness of the customer-described impact.

Allowed values:
- low
- medium
- high
- critical
- none

Use critical only for explicitly described severe impact.
Do not escalate because wording is emotional.

High or critical severity must be supported by concrete evidence in the
feedback and should correspond to a real issue/aspect.

8. URGENCY

Urgency is how quickly the described situation appears to require attention.

Allowed values:
- low
- medium
- high
- immediate
- none

Do not infer urgency merely from negative sentiment.

9. PRIORITY

Priority expresses how strongly this ONE feedback record deserves attention.

Allowed values:
- Low Priority
- Medium Priority
- High Priority
- Critical Priority

Consider only evidence inside this feedback, such as:
- severity
- urgency
- inability to use/access/purchase
- repeated failure explicitly described by this customer
- explicit escalation/cancellation signal
- explicit safety/security concern

Do not use aggregate frequency.

10. PRAISE

Positive feedback is valuable intelligence.

positiveAttributes should be concise, meaningful phrases describing what was
praised.

Prefer:
- "Fast checkout experience"
- "Clean and well-organized environment"
- "Helpful staff assistance"

Avoid unnecessarily fragmented labels such as:
- "fast"
- "clean"
- "professional"

Do not expand beyond what the customer actually praised.

11. REQUESTS

requestedCapabilities contains explicit requested features, services,
capabilities, options, or improvements.

Do not turn ordinary complaints into feature requests.

12. ACTIONS

Return 0-3 practical actions grounded in this feedback.

Actions may suggest:
- review
- investigate
- verify
- clarify
- preserve
- monitor
- consider an explicit request

Do not promise outcomes.
Do not invent internal causes or remedies.

==================================================
FIELD GUIDANCE
==================================================

overallSentiment:
Exactly one of Positive | Negative | Neutral | Mixed.

Use Mixed when meaningful positive and negative views coexist.

intents:
Dynamic semantic intents such as complaint, praise, suggestion,
feature_request, bug_report, question, support_request, cancellation_risk,
purchase_interest, comparison, general_feedback, unclear.
More than one may apply.

topics:
Broad subjects dynamically discovered from the text.
Not restricted to configured categories.

issues:
Concrete customer-reported problems only.
Each issue should include:
- description
- topic where useful
- evidence snippets

Even when primaryCategory = "Uncategorized", still return all supported topics
and issues.

requestedCapabilities:
Explicit asks only.

positiveAttributes:
Specific praise phrases grounded in the text.

aspects:
Use only when multiple distinct opinions/areas genuinely exist.
Each aspect contains:
- category/topic
- sentiment
- observation
- severity
- evidence

rootCauseHypotheses:
0-3 only when the feedback contains explicit causal evidence.
Otherwise [].

executiveSummary:
A concise factual summary of what THIS feedback expresses.
Do not make aggregate claims.

==================================================
LOW-INFORMATION INPUT
==================================================

If the message does not contain enough meaningful information:

overallSentiment = "Neutral"
intents = ["unclear"]
topics = []
issues = []
requestedCapabilities = []
positiveAttributes = []
rootCauseHypotheses = []
actionItems = []
aspects = []
severity = "none"
urgency = "none"
priority = "Low Priority"
primaryCategory = "Uncategorized"
matchedCategories = ["Uncategorized"]

Short feedback can still be meaningful. Judge meaning, not length.

==================================================
FINAL CHECK
==================================================

Before returning JSON verify:

- Did I understand before categorizing?
- Did I preserve topics/issues even if category is Uncategorized?
- Did I separate topic from issue?
- Did I preserve mixed sentiment?
- Did I preserve praise?
- Did I detect explicit requests separately?
- Is every issue supported by this feedback?
- Is high/critical severity supported by evidence?
- Is urgency actually supported?
- Is priority justified by this single record?
- Does every root-cause hypothesis contain explicit causal evidence?
- Did I avoid speculative causes?
- Did I avoid aggregate/trend/customer-count claims?
- Did I use configured category labels exactly?
`;

    const started = Date.now();

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryCategory: {
              type: Type.STRING,
            },

            primaryCategoryConfidence: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },

            matchedCategories: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            overallSentiment: {
              type: Type.STRING,
              enum: ["Positive", "Negative", "Neutral", "Mixed"],
            },

            sentimentConfidence: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },

            intents: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: {
                    type: Type.STRING,
                  },

                  topic: {
                    type: Type.STRING,
                  },

                  severity: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high", "critical", "none"],
                  },

                  urgency: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high", "immediate", "none"],
                  },

                  evidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                  },
                },

                required: ["description", "severity", "urgency", "evidence"],
              },
            },

            requestedCapabilities: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            positiveAttributes: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            severity: {
              type: Type.STRING,
              enum: ["low", "medium", "high", "critical", "none"],
            },

            urgency: {
              type: Type.STRING,
              enum: ["low", "medium", "high", "immediate", "none"],
            },

            priority: {
              type: Type.STRING,
              enum: [
                "Critical Priority",
                "High Priority",
                "Medium Priority",
                "Low Priority",
              ],
            },

            priorityConfidence: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },

            executiveSummary: {
              type: Type.STRING,
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
                  evidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                  },
                },
                required: ["hypothesis", "confidence", "evidence"],
              },
            },

            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },

            aspects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                  },
                  sentiment: {
                    type: Type.STRING,
                    enum: ["Positive", "Negative", "Neutral", "Mixed"],
                  },
                  observation: {
                    type: Type.STRING,
                  },
                  severity: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high", "critical", "none"],
                  },
                  evidence: {
                    type: Type.STRING,
                  },
                },
                required: ["category", "sentiment", "observation"],
              },
            },
          },

          required: [
            "primaryCategory",
            "matchedCategories",
            "overallSentiment",
            "intents",
            "topics",
            "issues",
            "requestedCapabilities",
            "positiveAttributes",
            "severity",
            "urgency",
            "priority",
            "executiveSummary",
            "actionItems",
            "rootCauseHypotheses",
            "aspects",
          ],
        },
      },
    });

    const latency = Date.now() - started;
    const rawJson = response.text || "{}";
    const parsed = JSON.parse(rawJson);

    /**
     * Category validation
     *
     * Invalid model-generated labels never fall back to the first configured
     * category. They become Uncategorized instead.
     */
    const primaryCategoryCandidate = String(
      parsed.primaryCategory || "",
    ).trim();

    const primaryCat =
      primaryCategoryCandidate === "Uncategorized" ||
      availableLabels.includes(primaryCategoryCandidate)
        ? primaryCategoryCandidate || "Uncategorized"
        : "Uncategorized";

    const matchedCatsRaw = Array.isArray(parsed.matchedCategories)
      ? parsed.matchedCategories
          .map(String)
          .map((category: string) => category.trim())
          .filter(Boolean)
      : [];

    const validMatchedCats = uniqueStrings(
      matchedCatsRaw.filter(
        (category: string) =>
          category === "Uncategorized" || availableLabels.includes(category),
      ),
      20,
    );

    let matchedCats =
      validMatchedCats.length > 0 ? validMatchedCats : [primaryCat];

    if (primaryCat !== "Uncategorized" && !matchedCats.includes(primaryCat)) {
      matchedCats.unshift(primaryCat);
    }

    if (
      matchedCats.length === 0 ||
      (matchedCats.every((category) => !availableLabels.includes(category)) &&
        primaryCat === "Uncategorized")
    ) {
      matchedCats = ["Uncategorized"];
    }

    const sentimentLabel = normalizeSentimentLabel(parsed.overallSentiment);

    const issues = normalizeIssues(parsed.issues, sanitized);

    const aspects = normalizeAspects(parsed.aspects, sanitized);

    const severity = normalizeOverallSeverity(parsed.severity, issues, aspects);

    const urgency = normalizeOverallUrgency(parsed.urgency, severity);

    const priorityLabel = normalizeOverallPriority(
      parsed.priority,
      severity,
      urgency,
    );

    const hypotheses = normalizeRootCauseHypotheses(
      parsed.rootCauseHypotheses,
      sanitized,
    );

    const intents = asStringList(parsed.intents, 8);
    const topics = asStringList(parsed.topics, 8);

    const requestedCapabilities = asStringList(parsed.requestedCapabilities, 5);

    const positiveAttributes = normalizePositiveAttributes(
      parsed.positiveAttributes,
      sanitized,
    );

    const actionItems = Array.isArray(parsed.actionItems)
      ? parsed.actionItems
          .map((item: unknown) => stripBusinessClaims(String(item || "")))
          .filter(Boolean)
          .slice(0, 3)
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
          impact:
            severity === "none" ? "No problem severity indicated" : severity,
          sentiment: sentimentLabel,
        },
      },

      severity,
      urgency,

      intents,
      topics,
      issues,

      requestedCapabilities,
      positiveAttributes,

      impact: {
        label: severity === "none" ? "None" : severity,
        confidence: "medium",
      },

      scope: {
        label: "Not quantifiable from feedback alone",
        confidence: "low",
      },

      summary: String(parsed.executiveSummary || "")
        .trim()
        .slice(0, 500),

      rootCauseHypotheses: hypotheses,
      root_cause: hypotheses[0]?.hypothesis,

      action_items: actionItems,

      aspects,

      analysis_version: ANALYSIS_VERSION,
      schema_version: SCHEMA_VERSION,
      prompt_version: PROMPT_VERSION,

      model_provider: "google",
      model_name: MODEL_NAME,
    };

    logger.info("AI analysis completed", {
      provider: "google",
      model: MODEL_NAME,
      latencyMs: latency,
      analysisVersion: ANALYSIS_VERSION,
      issueCount: issues.length,
      rootCauseHypothesisCount: hypotheses.length,
      category: primaryCat,
    });

    return result;
  } catch (error) {
    logger.error("Gemini classification failed", {
      error: error instanceof Error ? error.message : "unknown",
    });

    return generateFallbackDeepAnalysis(sanitized, availableLabels);
  }
}

function generateFallbackDeepAnalysis(
  text: string,
  availableLabels: string[],
): DeepAnalysisResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const looksMeaningful =
    trimmed.length >= 3 &&
    /[a-z]{2,}/i.test(trimmed) &&
    !/^(.)\1{4,}$/i.test(trimmed.replace(/\s/g, ""));

  const isNegative =
    looksMeaningful &&
    /\b(bug|error|fail|failed|broken|slow|crash|crashes|issue|problem|late|wrong|missing|bad|poor|difficult|cannot|can't|won't|didn't|unsafe)\b/i.test(
      lower,
    );

  const isPositive =
    looksMeaningful &&
    /\b(great|good|love|loved|awesome|excellent|helpful|easy|fast|clean|professional|thank|thanks)\b/i.test(
      lower,
    );

  const sentimentLabel: SentimentLabel =
    isNegative && isPositive
      ? "Mixed"
      : isNegative
        ? "Negative"
        : isPositive
          ? "Positive"
          : "Neutral";

  const matchedCats = looksMeaningful
    ? availableLabels.filter((label) => lower.includes(label.toLowerCase()))
    : [];

  if (matchedCats.length === 0) {
    matchedCats.push("Uncategorized");
  }

  const primaryCat = matchedCats[0] || "Uncategorized";

  /**
   * Fallback is deliberately conservative.
   *
   * It does not pretend to understand topics/issues/root causes with the depth
   * of the AI model, and negative feedback is not automatically High Priority.
   */
  const priorityLabel =
    isNegative && looksMeaningful ? "Medium Priority" : "Low Priority";

  return {
    category: {
      label: primaryCat,
      confidence: "low",
    },

    categories: matchedCats,

    sentiment: {
      label: sentimentLabel,
      confidence: "low",
    },

    priority: {
      label: priorityLabel,
      confidence: "low",
      reasoning: {
        impact: isNegative
          ? "Potential customer problem detected by heuristic fallback"
          : "No reliable problem severity established",
        sentiment: sentimentLabel,
      },
    },

    severity: isNegative && looksMeaningful ? "medium" : "none",

    urgency: "none",

    intents: looksMeaningful
      ? isNegative
        ? ["complaint"]
        : isPositive
          ? ["praise"]
          : ["general_feedback"]
      : ["unclear"],

    topics: [],
    issues: [],

    requestedCapabilities: [],
    positiveAttributes: [],

    impact: {
      label: isNegative && looksMeaningful ? "medium" : "None",
      confidence: "low",
    },

    scope: {
      label: "Not quantifiable from feedback alone",
      confidence: "low",
    },

    summary: looksMeaningful
      ? trimmed.slice(0, 300)
      : "The message does not contain enough meaningful information for reliable feedback analysis.",

    rootCauseHypotheses: [],
    root_cause: undefined,

    action_items: [],
    aspects: [],

    analysis_version: ANALYSIS_VERSION,
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,

    model_provider: "fallback",
    model_name: "heuristic",
  };
}

import { GoogleGenAI, Type } from "@google/genai";
import { getConfig } from "../config/env.js";
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
import { logger } from "../logging/logger.js";

export type {
  DeepAnalysisResult,
  AspectDetail,
  FeedbackIssue,
  RootCauseHypothesis,
} from "./types.js";
export { ANALYSIS_VERSION, SCHEMA_VERSION, PROMPT_VERSION } from "./types.js";

const MODEL_NAME = "gemini-3.5-flash-lite";

/**
 * Classify feedback asynchronously-safe. Callers must persist original text first.
 * Only sanitized text is sent to the AI provider.
 */
export async function classifyImpactSingle(
  text: string,
  activeLabels: string[] = [],
): Promise<DeepAnalysisResult> {
  if (!text || text.trim() === "") {
    throw new Error("Invalid input: text is required.");
  }

  const availableLabels =
    activeLabels.length > 0
      ? activeLabels
      : [
          "Bug Report",
          "Performance Issue",
          "UI/UX",
          "Feature Request",
          "Customer Support",
          "Security",
        ];

  const { sanitized, redactions } = sanitizeForAi(text);
  if (redactions.length > 0) {
    logger.info("PII redacted before AI call", { redactionTypes: redactions });
  }

  const apiKey = getConfig().geminiApiKey;
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY not set; using heuristic analysis");
    return generateFallbackDeepAnalysis(sanitized, availableLabels);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    //     const prompt = `You are a Product Feedback Intelligence analyst helping a business listen to customers.
    // Analyze the following customer feedback. Accept any wording — do not force a feedback "kind" or taxonomy. Make no assumptions about the customer's intent or context.Every claim must be supported only by the provided text. If you are unsure, say so.

    // Available Product Categories (use only when the text clearly supports them; otherwise Uncategorized):
    // [${availableLabels.join(", ")}]

    // Customer Feedback (PII-minimized):
    // "${sanitized}"

    // Rules:
    // 1. Multi-label: identify ALL relevant categories from the available list when the text supports them. If none fit, primaryCategory = "Uncategorized" and matchedCategories = ["Uncategorized"].
    // 2. Primary category: the single most dominant category, or Uncategorized.
    // 3. Sentiment: Positive, Negative, Neutral, or Mixed. If the message is unclear or nonsense, prefer Neutral.
    // 4. Priority: High Priority only when the text describes a concrete product/service problem. Unclear, empty-meaning, or nonsensical text → Low Priority.
    // 5. Aspect breakdown: only when there is real product content; otherwise return [].
    // 6. Action items: 0-3 recommendations grounded in the text (no invented ROI, churn %, revenue, or monetary impact). If there is no clear customer experience to act on, return [].
    // 7. Root-cause hypotheses: 0-3 HYPOTHESES only, each with confidence (low|medium|high) and evidence snippets from the feedback. If there is no concrete product issue in the text, return []. Do NOT invent refunds, missing transactions, ledger errors, audits, gateway failures, or form-validation / spam-filter work.
    // 8. Do not invent internal systems, customer counts, financial outcomes, or facts not present in the feedback.
    // 9. Executive summary: what the customer actually expressed. If there is no actionable product feedback, say that clearly.
    // 10. Confidence values must be qualitative: low, medium, or high — never fabricated numeric precision.`;

    const prompt = `
You are an AI Customer Feedback Intelligence analyst.

Your job is to understand customer feedback exactly as a skilled customer-experience, product, and operations analyst would.

The feedback may be ANY kind of customer message, including:
- complaint
- praise
- suggestion
- feature request
- bug report
- service problem
- delivery problem
- pricing concern
- billing/payment concern
- usability problem
- performance problem
- support experience
- question
- cancellation/churn signal
- comparison with another product/service
- mixed positive and negative feedback
- short or informal feedback
- slang, spelling mistakes, incomplete sentences
- multiple different issues in one message
- feedback that does not fit any configured category

Do NOT force the message into a predefined "type" or category before understanding it.

First understand what the customer actually said.
Then structure that understanding.

Customer Feedback (PII-minimized):
"""
${sanitized}
"""

Configured Business Categories:
[${availableLabels.join(", ")}]

The configured categories are ONLY for business categorization.
They must NOT limit your understanding of the feedback.

A customer may discuss a topic or issue that is not represented in the configured categories.
You should still detect and describe that topic/issue correctly.

==================================================
CORE ANALYSIS PRINCIPLES
==================================================

1. Analyze only what is supported by the customer's message.

2. Do not invent:
- internal system failures
- technical implementation details
- transactions
- refunds
- database failures
- payment gateway failures
- business processes
- customer history
- customer counts
- revenue impact
- churn percentages
- financial impact
- operational facts
that are not supported by the feedback.

3. Preserve nuance.

For example:

"The product is great but delivery took two weeks."

This is NOT simply Negative.

It should be understood approximately as:

overall sentiment: Mixed

aspects:
- Product → Positive
- Delivery → Negative

4. Do not confuse TOPIC with ISSUE.

Topic:
Delivery

Issue:
Delivery took too long

Topic:
Customer Support

Issue:
Support did not respond after multiple attempts

Topic:
Reporting

Requested capability:
Export reports to Excel

5. Categories are organization-defined labels.

Use configured categories when they clearly match the feedback.

Do not distort the customer's meaning merely to fit a category.

If no configured category reasonably represents the message:

primaryCategory = "Uncategorized"

"Uncategorized" does NOT mean the feedback has no useful topic or issue.

You should still extract topics, issues, intent, sentiment, and other useful intelligence.

==================================================
INTENT / FEEDBACK UNDERSTANDING
==================================================

Determine the customer's apparent intent when reasonably supported.

Possible intents include, but are not limited to:

- complaint
- praise
- suggestion
- feature_request
- bug_report
- question
- support_request
- cancellation_risk
- purchase_interest
- comparison
- general_feedback
- unclear

More than one intent may apply.

Do not force an intent if the message is genuinely unclear.

==================================================
SENTIMENT
==================================================

Classify overall sentiment as exactly one of:

- Positive
- Negative
- Neutral
- Mixed

Use Mixed when meaningful positive and negative views coexist.

Do not classify based only on keywords.

Understand the context.

Examples:

"Great product, terrible support."
→ Mixed

"It works."
→ Neutral

"I absolutely love the new dashboard."
→ Positive

"I've contacted you four times and still haven't received help."
→ Negative

If the message is unintelligible or contains too little meaningful information:
→ Neutral

==================================================
TOPICS
==================================================

Identify the major subjects being discussed.

Topics are broad areas such as:

- Delivery
- Customer Support
- Pricing
- Billing
- Checkout
- Mobile App
- Product Quality
- Performance
- Reporting
- Documentation

Topics are NOT restricted to the configured categories.

Discover the topic from the customer's actual wording.

Only include topics supported by the feedback.

==================================================
ISSUES
==================================================

Identify concrete customer problems separately from topics.

An issue should describe WHAT went wrong from the customer's perspective.

Examples:

Topic:
Delivery

Issue:
Order arrived significantly later than expected

Topic:
Customer Support

Issue:
Customer did not receive a response after repeated contacts

Topic:
Mobile App

Issue:
Application crashes when attempting to upload an image

Do NOT invent a root technical cause.

If the customer says:

"The payment page keeps failing."

Valid issue:
Payment could not be completed

Invalid invented cause:
Payment gateway API timeout

A single feedback message may contain zero, one, or multiple issues.

==================================================
FEATURE REQUESTS / SUGGESTIONS
==================================================

Explicitly detect requested capabilities or improvements.

Example:

"I wish I could export this report to Excel."

Should produce something approximately like:

intent:
feature_request

topic:
Reporting

requestedCapability:
Export reports to Excel

Do not rewrite ordinary complaints as feature requests.

==================================================
PRAISE
==================================================

Positive feedback is valuable intelligence.

When the customer praises something, identify:

- what area they praised
- what specific attribute they appreciated

Example:

"Support solved my issue in five minutes."

topic:
Customer Support

positiveAttribute:
Fast resolution

Do not discard praise simply because there is no problem to fix.

==================================================
ASPECT ANALYSIS
==================================================

Break feedback into meaningful aspects when multiple distinct opinions exist.

Each aspect should contain:

- aspect/topic
- sentiment
- concise observation
- severity if applicable
- evidence from the customer's text

Example:

"The app is easy to use but crashes every time I upload a photo."

Aspects:

1.
aspect: Usability
sentiment: Positive
observation: Customer finds the application easy to use

2.
aspect: Reliability
sentiment: Negative
observation: Application crashes during photo upload
severity: High

Do not create artificial aspects for simple one-dimensional feedback.

==================================================
SEVERITY
==================================================

Severity represents the seriousness of the customer problem.

Use:

- low
- medium
- high
- critical

Evaluate severity from the customer-described impact.

Examples:

Low:
minor inconvenience or cosmetic concern

Medium:
meaningful inconvenience or degraded experience

High:
important functionality unavailable, repeated failure, significant service problem

Critical:
feedback indicates severe safety, security, account-access, major financial-loss, or similarly serious impact explicitly supported by the message

Do not mark something Critical merely because the customer uses angry language.

If there is no problem, severity may be null/not applicable.

==================================================
URGENCY
==================================================

Urgency is different from severity.

Use:

- low
- medium
- high
- immediate

Examples:

"My order was one day late."
could be severity/urgency Low or Medium.

"I need access before my client presentation in one hour."
may have High or Immediate urgency.

Only infer urgency when the text supports it.

Do not treat every negative message as urgent.

==================================================
PRIORITY
==================================================

Priority represents how strongly this single feedback item deserves business attention.

Use:

- Low Priority
- Medium Priority
- High Priority
- Critical Priority

Consider:

- severity
- urgency
- repeated failure mentioned by the customer
- inability to use/purchase/access a service
- explicit safety/security concern
- clear cancellation/escalation signal

Do NOT use popularity/frequency because this prompt analyzes only one feedback item.

Frequency should be calculated later across multiple feedback records by the analytics system.

Positive feedback normally has Low Priority unless it contains another important issue.

==================================================
ROOT-CAUSE HYPOTHESES
==================================================

Only generate a root-cause hypothesis when the customer's text provides enough evidence to suggest one.

These must ALWAYS be presented as hypotheses, never confirmed facts.

Each hypothesis must contain:

- hypothesis
- confidence: low | medium | high
- evidence: exact or closely paraphrased evidence from the feedback

Example:

Feedback:
"The app freezes every time I upload a large video."

Acceptable hypothesis:
"The problem may be associated with large video uploads."

Evidence:
"freezes every time I upload a large video"

Not acceptable:
"The media-processing server is running out of memory."

because the customer did not provide evidence for that technical cause.

If the text does not support a meaningful hypothesis:
return []

==================================================
ACTION ITEMS
==================================================

Generate 0-3 practical business actions.

Actions must follow from the customer's actual feedback.

Good examples:

- Review the reported photo-upload crash.
- Contact the customer to clarify the billing discrepancy.
- Consider the request for Excel export when reviewing reporting improvements.
- Preserve the fast support-resolution process highlighted by the customer.

Do not recommend fake or overly specific actions based on assumptions.

Do not invent:

- refunds
- audits
- engineering incidents
- payment investigations
- customer outreach

unless the feedback reasonably justifies such an action.

If no action is warranted:
return []

Positive feedback can also produce appropriate actions, for example:

- Preserve this aspect of the customer experience.
- Consider highlighting this strength in future customer research.

But do not force an action for every feedback item.

==================================================
BUSINESS CATEGORY MATCHING
==================================================

After understanding the feedback, map it to the configured business categories.

Use ALL configured categories clearly supported by the message.

Rules:

- matchedCategories may contain multiple values.
- primaryCategory should represent the dominant business category.
- Use the labels exactly as provided.
- Never invent a configured category.
- Do not choose a category merely because it is vaguely related.
- If none match:
  primaryCategory = "Uncategorized"
  matchedCategories = ["Uncategorized"]

Category matching should not erase richer topic/issue information.

==================================================
EVIDENCE
==================================================

Every important conclusion should be traceable to the customer's text.

Evidence should be short snippets or close paraphrases from the feedback.

Provide evidence especially for:

- issues
- high/critical severity
- high/critical priority
- cancellation risk
- root-cause hypotheses
- important aspect sentiment

Do not use external knowledge as evidence.

==================================================
EXECUTIVE SUMMARY
==================================================

Write a concise factual summary of what the customer expressed.

The summary should capture:

- main experience/opinion
- important problem(s)
- important praise
- requested capability where relevant

Do not write generic templates such as:

"Customer provided negative feedback."

Prefer:

"Customer likes the product but reports that delivery took much longer than expected."

For a feature request:

"Customer is requesting the ability to export reports to Excel."

For praise:

"Customer praised the support team's fast resolution."

For a question:

"Customer is asking whether the service supports international shipping."

If the message contains no meaningful customer feedback:

"The message does not contain enough meaningful information for reliable feedback analysis."

==================================================
UNCLEAR / NONSENSE / LOW-INFORMATION INPUT
==================================================

Do not hallucinate meaning.

Examples:

"asdfgh"
"ok"
"..."
"test"

If there is insufficient meaning:

- overall sentiment should generally be Neutral
- intents may contain "unclear"
- topics = []
- issues = []
- aspects = []
- requestedCapabilities = []
- positiveAttributes = []
- rootCauseHypotheses = []
- actionItems = []
- primaryCategory = "Uncategorized"
- matchedCategories = ["Uncategorized"]
- priority = "Low Priority"
- explain in executiveSummary that meaningful feedback could not be determined

However, short feedback CAN still be meaningful.

Examples:

"Too expensive"
→ Pricing concern

"Love it"
→ Positive praise

"App crashes"
→ Reliability/problem

"Need dark mode"
→ Feature request

Do not reject useful short feedback just because it lacks detail.

==================================================
MULTIPLE ISSUES
==================================================

A single customer message may contain several independent experiences.

Example:

"The app is fast and easy to use, but payments fail and support hasn't replied for three days."

Correctly identify:

Positive:
- performance
- usability

Negative issues:
- payment failure
- lack of support response

Overall sentiment:
Mixed

Do not compress all of this into one generic category.

==================================================
IMPORTANT LIMITATIONS
==================================================

This analysis concerns ONE customer feedback record.

Therefore DO NOT claim:

- "many customers"
- "recurring issue"
- "trend"
- "increasing complaints"
- "most requested"
- "business impact is high across customers"
- "churn increased"
- "revenue is affected"

Those conclusions require aggregate data and belong to the analytics/issue-clustering layer.

You may only describe the impact conveyed by this individual customer's message.

==================================================
FINAL QUALITY CHECK
==================================================

Before returning the result, verify:

- Did I understand the customer's actual meaning?
- Did I preserve mixed opinions?
- Did I separate topics from concrete issues?
- Did I identify feature requests separately?
- Did I preserve praise?
- Did I avoid forcing everything into configured categories?
- Did I avoid inventing technical causes?
- Is severity justified?
- Is urgency justified?
- Is priority justified?
- Are recommendations grounded in the message?
- Is every important conclusion supported by the feedback?
- Did I avoid aggregate claims from a single feedback record?

Be conservative about unsupported facts,
but be thorough about information that IS actually present in the customer's message.

==================================================
JSON OUTPUT FIELDS
==================================================

Return JSON matching the schema. Field meanings:

- intents: string[] of apparent intents (e.g. complaint, praise, feature_request, unclear)
- topics: string[] broad subjects from the customer's wording
- issues: [{ description, topic, evidence[] }] concrete problems only; else []
- requestedCapabilities: string[] explicit feature/improvement asks; else []
- positiveAttributes: string[] specific praise attributes; else []
- severity: low | medium | high | critical | none
- urgency: low | medium | high | immediate | none
- priority: Low Priority | Medium Priority | High Priority | Critical Priority
- aspects: [{ category, sentiment, observation, severity, evidence }] only when multiple distinct opinions; else []
- rootCauseHypotheses / actionItems: empty arrays when unsupported
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
            primaryCategory: { type: Type.STRING },
            primaryCategoryConfidence: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },
            matchedCategories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            overallSentiment: {
              type: Type.STRING,
              enum: ["Positive", "Negative", "Neutral", "Mixed"],
            },
            sentimentConfidence: {
              type: Type.STRING,
              enum: ["low", "medium", "high"],
            },
            intents: { type: Type.ARRAY, items: { type: Type.STRING } },
            topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["description"],
              },
            },
            requestedCapabilities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            positiveAttributes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
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
            executiveSummary: { type: Type.STRING },
            rootCauseHypotheses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hypothesis: { type: Type.STRING },
                  confidence: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high"],
                  },
                  evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["hypothesis", "confidence", "evidence"],
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
                    enum: ["Positive", "Negative", "Neutral", "Mixed"],
                  },
                  observation: { type: Type.STRING },
                  severity: {
                    type: Type.STRING,
                    enum: ["low", "medium", "high", "critical", "none"],
                  },
                  evidence: { type: Type.STRING },
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

    const primaryCat =
      parsed.primaryCategory === "Uncategorized" ||
      availableLabels.includes(parsed.primaryCategory)
        ? parsed.primaryCategory || "Uncategorized"
        : availableLabels[0] || "General";

    const matchedCats: string[] =
      Array.isArray(parsed.matchedCategories) &&
      parsed.matchedCategories.length > 0
        ? parsed.matchedCategories.filter(
            (c: string) => availableLabels.includes(c) || c === "Uncategorized",
          )
        : [primaryCat];
    if (!matchedCats.includes(primaryCat)) matchedCats.unshift(primaryCat);

    const sentimentLabel = normalizeSentimentLabel(parsed.overallSentiment);
    const priorityLabel = normalizePriorityLabel(parsed.priority);
    const severity = normalizeSeverityLevel(parsed.severity);
    const urgency = normalizeUrgencyLevel(parsed.urgency);

    const hypotheses: RootCauseHypothesis[] = Array.isArray(
      parsed.rootCauseHypotheses,
    )
      ? parsed.rootCauseHypotheses.map(
          (h: {
            hypothesis?: string;
            confidence?: string;
            evidence?: string[];
          }) => ({
            hypothesis: String(h.hypothesis || "").slice(0, 500),
            confidence: toQualitativeConfidence(h.confidence),
            evidence: Array.isArray(h.evidence)
              ? h.evidence.map(String).slice(0, 5)
              : [],
          }),
        )
      : [];

    const aspects: AspectDetail[] = Array.isArray(parsed.aspects)
      ? parsed.aspects.map(
          (a: {
            category?: string;
            sentiment?: string;
            observation?: string;
            severity?: string;
            evidence?: string;
            snippet?: string;
          }) => {
            const observation = String(a.observation || a.snippet || "").slice(
              0,
              500,
            );
            const evidence = String(a.evidence || a.snippet || "").slice(0, 300);
            return {
              category: String(a.category || "General").slice(0, 120),
              sentiment: normalizeSentimentLabel(a.sentiment),
              observation,
              severity: normalizeSeverityLevel(a.severity),
              evidence,
              snippet: evidence || observation,
            };
          },
        )
      : [];

    const issues: FeedbackIssue[] = Array.isArray(parsed.issues)
      ? parsed.issues
          .filter(
            (i: { description?: string }) =>
              i && typeof i.description === "string" && i.description.trim(),
          )
          .map(
            (i: {
              description?: string;
              topic?: string;
              evidence?: string[];
            }) => ({
              description: String(i.description).slice(0, 400),
              topic: i.topic ? String(i.topic).slice(0, 120) : undefined,
              evidence: Array.isArray(i.evidence)
                ? i.evidence.map(String).slice(0, 5)
                : [],
            }),
          )
      : [];

    const intents = asStringList(parsed.intents, 8);
    const topics = asStringList(parsed.topics, 8);
    const requestedCapabilities = asStringList(parsed.requestedCapabilities, 5);
    const positiveAttributes = asStringList(parsed.positiveAttributes, 5);

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
          impact: severity === "none" ? "No problem severity indicated" : severity,
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
      summary: String(parsed.executiveSummary || "").slice(0, 500),
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
    });

    return result;
  } catch (error) {
    logger.error("Gemini classification failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return generateFallbackDeepAnalysis(sanitized, availableLabels);
  }
}

function normalizeSentimentLabel(value: unknown): SentimentLabel {
  const raw = String(value || "Neutral");
  if (/mixed/i.test(raw)) return "Mixed";
  if (/pos/i.test(raw)) return "Positive";
  if (/neg/i.test(raw)) return "Negative";
  return "Neutral";
}

function asStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim().slice(0, 120))
    .slice(0, max);
}

function stripBusinessClaims(text: string): string {
  return text
    .replace(
      /reduces?\s+churn\s+by\s+~?\d+%/gi,
      "may help retain customers (impact not quantifiable from feedback alone)",
    )
    .replace(
      /increase[sd]?\s+revenue\s+by\s+~?\d+%/gi,
      "may improve outcomes (impact not quantifiable)",
    )
    .replace(
      /save[sd]?\s+~?\d+%/gi,
      "may reduce friction (impact not quantifiable)",
    )
    .replace(/ROI\s+of\s+~?\d+%/gi, "qualitative operational benefit")
    .replace(
      /estimated\s+ROI[^.]*\./gi,
      "Impact is not quantifiable from feedback alone.",
    );
}

function generateFallbackDeepAnalysis(
  text: string,
  availableLabels: string[],
): DeepAnalysisResult {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const looksMeaningful =
    trimmed.length >= 8 &&
    /[a-z]{3,}/i.test(trimmed) &&
    !/^(.)\1{5,}$/i.test(trimmed.replace(/\s/g, ""));

  const isNegative =
    looksMeaningful &&
    /bug|error|fail|broken|slow|crash|issue|problem/.test(lower);
  const isPositive =
    looksMeaningful && /great|good|love|awesome|excellent|thank/.test(lower);
  const sentimentLabel: SentimentLabel =
    isNegative && isPositive
      ? "Mixed"
      : isNegative
        ? "Negative"
        : isPositive
          ? "Positive"
          : "Neutral";

  const matchedCats = looksMeaningful
    ? availableLabels.filter((lbl) => lower.includes(lbl.toLowerCase()))
    : [];
  if (matchedCats.length === 0) matchedCats.push("Uncategorized");
  const primaryCat = matchedCats[0];

  return {
    category: { label: primaryCat, confidence: "low" },
    categories: matchedCats,
    sentiment: { label: sentimentLabel, confidence: "low" },
    priority: {
      label: isNegative ? "High Priority" : "Low Priority",
      confidence: "low",
      reasoning: { impact: "Heuristic only", sentiment: sentimentLabel },
    },
    severity: isNegative ? "medium" : "none",
    urgency: "none",
    intents: looksMeaningful
      ? isNegative
        ? ["complaint"]
        : isPositive
          ? ["praise"]
          : ["unclear"]
      : ["unclear"],
    topics: [],
    issues: [],
    requestedCapabilities: [],
    positiveAttributes: [],
    impact: { label: isNegative ? "medium" : "None", confidence: "low" },
    scope: { label: "Not quantifiable from feedback alone", confidence: "low" },
    summary: looksMeaningful
      ? trimmed.slice(0, 200)
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

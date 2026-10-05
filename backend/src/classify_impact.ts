import { GoogleGenAI, Type } from '@google/genai';

export interface AspectDetail {
    category: string;
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    severity: 'Critical' | 'Moderate' | 'Minor' | 'None';
    snippet: string;
}

export interface DeepAnalysisResult {
    // Primary classification
    category: {
        label: string;
        score: number;
        confidence: string;
        all_scores: Record<string, number>;
    };
    // Multi-label categories assigned
    categories: string[];
    sentiment: {
        label: 'Positive' | 'Negative' | 'Neutral';
        score: number;
        confidence: string;
        all_scores: Record<string, number>;
    };
    priority: {
        label: 'High Priority' | 'Medium Priority' | 'Low Priority';
        score: number;
        confidence: string;
        all_scores: Record<string, number>;
        reasoning?: {
            impact: string;
            sentiment: string;
        };
    };
    impact: {
        label: string;
        score: number;
        confidence: string;
        all_scores: Record<string, number>;
    };
    scope: {
        label: string;
        score: number;
        confidence: string;
        all_scores: Record<string, number>;
    };
    // Next-Level Deep AI Insights
    summary: string;
    root_cause?: string;
    action_items: string[];
    aspects: AspectDetail[];
}

/**
 * Next-Level Aspect-Based Multi-Label Classifier powered by Google Gemini.
 * Performs deep semantic reasoning, multi-label extraction, granular aspect breakdowns,
 * and actionable recommendation synthesis in a single high-speed call.
 */
export async function classifyImpactSingle(
    text: string,
    activeLabels: string[] = []
): Promise<DeepAnalysisResult> {
    if (!text || text.trim() === '') {
        throw new Error('Invalid input: text is required.');
    }

    const availableLabels = activeLabels.length > 0
        ? activeLabels
        : ['Bug Report', 'Performance Issue', 'UI/UX', 'Feature Request', 'Customer Support', 'Security'];

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('GEMINI_API_KEY is not set in backend .env. Using fallback multi-aspect heuristic.');
        return generateFallbackDeepAnalysis(text, availableLabels);
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are an elite Product Operations and AI Feedback Intelligence Agent.
Analyze the following customer feedback comprehensively.

Available Product Categories:
[${availableLabels.join(', ')}]

Customer Feedback:
"${text}"

Your goals:
1. Multi-Label Classification: Identify ALL relevant categories from the available list that apply (a feedback can touch on multiple areas).
2. Primary Category: Choose the single most dominant category.
3. Sentiment & Priority: Assess overall sentiment and urgency (High, Medium, Low).
4. Granular Aspect Breakdown: For each identified issue or compliment, extract the category, sentiment, severity level, and the specific quote/snippet.
5. Action Items: Extract 1-3 concrete, actionable engineering or product steps to resolve the issue or capitalize on praise.
6. Root Cause: Identify the underlying technical or operational root cause.
7. Executive Summary: A crisp 1-sentence summary of the feedback.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        primaryCategory: { type: Type.STRING },
                        primaryCategoryConfidence: { type: Type.NUMBER },
                        matchedCategories: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        overallSentiment: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral'] },
                        sentimentConfidence: { type: Type.NUMBER },
                        priority: { type: Type.STRING, enum: ['High Priority', 'Medium Priority', 'Low Priority'] },
                        impactSeverity: { type: Type.STRING },
                        impactScope: { type: Type.STRING },
                        executiveSummary: { type: Type.STRING },
                        rootCause: { type: Type.STRING },
                        actionItems: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        aspects: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    category: { type: Type.STRING },
                                    sentiment: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral'] },
                                    severity: { type: Type.STRING, enum: ['Critical', 'Moderate', 'Minor', 'None'] },
                                    snippet: { type: Type.STRING }
                                },
                                required: ['category', 'sentiment', 'severity', 'snippet']
                            }
                        }
                    },
                    required: ['primaryCategory', 'matchedCategories', 'overallSentiment', 'priority', 'executiveSummary', 'actionItems']
                }
            }
        });

        const rawJson = response.text || '{}';
        const parsed = JSON.parse(rawJson);

        const primaryCat = availableLabels.includes(parsed.primaryCategory)
            ? parsed.primaryCategory
            : (availableLabels[0] || 'General');

        const catConfidence = parsed.primaryCategoryConfidence || 0.94;
        const matchedCats: string[] = Array.isArray(parsed.matchedCategories) && parsed.matchedCategories.length > 0
            ? parsed.matchedCategories.filter((c: string) => availableLabels.includes(c))
            : [primaryCat];

        if (!matchedCats.includes(primaryCat)) {
            matchedCats.unshift(primaryCat);
        }

        const sentimentLabel = parsed.overallSentiment || 'Neutral';
        const sentimentConf = parsed.sentimentConfidence || 0.90;

        const priorityLabel = parsed.priority || 'Medium Priority';
        const priorityScore = priorityLabel === 'High Priority' ? 0.95 : (priorityLabel === 'Medium Priority' ? 0.65 : 0.35);

        const categoryScores: Record<string, number> = {};
        availableLabels.forEach(lbl => {
            if (matchedCats.includes(lbl)) {
                categoryScores[lbl] = lbl === primaryCat ? catConfidence : 0.75;
            } else {
                categoryScores[lbl] = 0.05;
            }
        });

        const aspects: AspectDetail[] = Array.isArray(parsed.aspects) ? parsed.aspects : [];
        const actionItems: string[] = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];
        const summary = parsed.executiveSummary || text.substring(0, 80) + '...';
        const rootCause = parsed.rootCause || undefined;

        return {
            category: {
                label: primaryCat,
                score: catConfidence,
                confidence: (catConfidence * 100).toFixed(2) + '%',
                all_scores: categoryScores
            },
            categories: matchedCats,
            sentiment: {
                label: sentimentLabel,
                score: sentimentConf,
                confidence: (sentimentConf * 100).toFixed(2) + '%',
                all_scores: {
                    Positive: sentimentLabel === 'Positive' ? sentimentConf : 0.05,
                    Negative: sentimentLabel === 'Negative' ? sentimentConf : 0.05,
                    Neutral: sentimentLabel === 'Neutral' ? sentimentConf : 0.05
                }
            },
            priority: {
                label: priorityLabel,
                score: priorityScore,
                confidence: (priorityScore * 100).toFixed(2) + '%',
                all_scores: {
                    'High Priority': priorityLabel === 'High Priority' ? 0.95 : 0.1,
                    'Medium Priority': priorityLabel === 'Medium Priority' ? 0.65 : 0.1,
                    'Low Priority': priorityLabel === 'Low Priority' ? 0.35 : 0.1
                },
                reasoning: {
                    impact: parsed.impactSeverity || 'Evaluated via Aspect Analysis',
                    sentiment: sentimentLabel
                }
            },
            impact: {
                label: parsed.impactSeverity || 'Moderate',
                score: 0.85,
                confidence: '85.00%',
                all_scores: {}
            },
            scope: {
                label: parsed.impactScope || 'Multiple Users',
                score: 0.85,
                confidence: '85.00%',
                all_scores: {}
            },
            summary,
            root_cause: rootCause,
            action_items: actionItems,
            aspects
        };
    } catch (error) {
        console.error('Gemini ABSA Classification Error:', error);
        return generateFallbackDeepAnalysis(text, availableLabels);
    }
}

function generateFallbackDeepAnalysis(text: string, availableLabels: string[]): DeepAnalysisResult {
    const lower = text.toLowerCase();
    const isNegative = lower.includes('bug') || lower.includes('error') || lower.includes('fail') || lower.includes('broken') || lower.includes('slow') || lower.includes('crash');
    const isPositive = lower.includes('great') || lower.includes('good') || lower.includes('love') || lower.includes('awesome') || lower.includes('excellent');

    const sentimentLabel: 'Positive' | 'Negative' | 'Neutral' = isNegative ? 'Negative' : (isPositive ? 'Positive' : 'Neutral');
    const priorityLabel: 'High Priority' | 'Medium Priority' | 'Low Priority' = isNegative ? 'High Priority' : 'Low Priority';

    const matchedCats = availableLabels.filter(lbl => lower.includes(lbl.toLowerCase()));
    if (matchedCats.length === 0) matchedCats.push(availableLabels[0] || 'General');

    const primaryCat = matchedCats[0];

    const categoryScores: Record<string, number> = {};
    availableLabels.forEach(lbl => {
        categoryScores[lbl] = matchedCats.includes(lbl) ? 0.85 : 0.05;
    });

    return {
        category: {
            label: primaryCat,
            score: 0.85,
            confidence: '85.00%',
            all_scores: categoryScores
        },
        categories: matchedCats,
        sentiment: {
            label: sentimentLabel,
            score: 0.85,
            confidence: '85.00%',
            all_scores: { Positive: isPositive ? 0.85 : 0.1, Negative: isNegative ? 0.85 : 0.1, Neutral: !isPositive && !isNegative ? 0.85 : 0.1 }
        },
        priority: {
            label: priorityLabel,
            score: isNegative ? 0.95 : 0.35,
            confidence: isNegative ? '95.00%' : '35.00%',
            all_scores: { 'High Priority': isNegative ? 0.95 : 0.1, 'Low Priority': !isNegative ? 0.95 : 0.1, 'Medium Priority': 0.1 },
            reasoning: {
                impact: isNegative ? 'System Malfunction' : 'Positive Feedback',
                sentiment: sentimentLabel
            }
        },
        impact: {
            label: isNegative ? 'High Severity' : 'Low Severity',
            score: 0.8,
            confidence: '80.00%',
            all_scores: {}
        },
        scope: {
            label: 'General Audience',
            score: 0.75,
            confidence: '75.00%',
            all_scores: {}
        },
        summary: text.substring(0, 100),
        action_items: [
            isNegative ? 'Review logs and investigate technical root cause' : 'Acknowledge positive user sentiment'
        ],
        aspects: [
            {
                category: primaryCat,
                sentiment: sentimentLabel,
                severity: isNegative ? 'Moderate' : 'None',
                snippet: text.substring(0, 50)
            }
        ]
    };
}

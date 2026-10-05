import { GoogleGenAI, Type } from '@google/genai';
import { Pool } from 'pg';

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
    total_high_priority: number;
    average_rating: number;
    primary_culprit_category: string;
    primary_culprit_neg_share: number;
    primary_culprit_high_priority_share: number;
    quantified_impact_statement: string;
    categories: CategoryCorrelation[];
    period_key: string;
    period_label: string;
}

export interface StrategicDecision {
    rank: number;
    title: string;
    department_or_area: string;
    urgency: 'Immediate (24-48h)' | 'Short-Term (1-2 Weeks)' | 'Strategic / Policy';
    decision: string;
    expected_roi_or_impact: string;
}

export interface ExecutiveBrief {
    headline: string;
    macro_health_status: 'Critical Alert' | 'Action Required' | 'Stable' | 'Healthy';
    executive_summary: string;
    impact_correlation: {
        primary_culprit_category: string;
        quantified_impact_statement: string;
        root_cause_diagnosis: string;
    };
    top_strategic_decisions: StrategicDecision[];
    strengths_to_reinforce: string[];
    period_key: string;
    period_label: string;
    generated_at: string;
    is_cached: boolean;
}

/**
 * Normalizes time periods into exact Date boundaries
 */
export function parsePeriodBounds(
    period: string = 'all',
    customStart?: string,
    customEnd?: string
): { periodKey: string; startDate: Date | null; endDate: Date | null; periodLabel: string } {
    const now = new Date();
    const cleanPeriod = (period || 'all').toLowerCase();

    switch (cleanPeriod) {
        case '7d': {
            const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return {
                periodKey: '7d',
                startDate: start,
                endDate: now,
                periodLabel: 'Last 7 Days'
            };
        }
        case '30d': {
            const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return {
                periodKey: '30d',
                startDate: start,
                endDate: now,
                periodLabel: 'Last 30 Days'
            };
        }
        case '90d': {
            const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            return {
                periodKey: '90d',
                startDate: start,
                endDate: now,
                periodLabel: 'Last 90 Days (Quarter)'
            };
        }
        case 'custom': {
            const start = customStart ? new Date(customStart) : null;
            const end = customEnd ? new Date(customEnd) : now;
            const key = `custom_${start?.toISOString().split('T')[0] || 'start'}_${end?.toISOString().split('T')[0] || 'now'}`;
            const label = start && end 
                ? `Custom Range (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`
                : 'Custom Date Range';
            return {
                periodKey: key,
                startDate: start,
                endDate: end,
                periodLabel: label
            };
        }
        case 'all':
        default:
            return {
                periodKey: 'all',
                startDate: null,
                endDate: null,
                periodLabel: 'All Time'
            };
    }
}

/**
 * Calculates mathematical impact correlation metrics directly in PostgreSQL
 * with timeframe-specific filtering.
 */
export async function calculateImpactCorrelation(
    productId: string,
    pool: Pool,
    startDate: Date | null = null,
    endDate: Date | null = null,
    periodKey: string = 'all',
    periodLabel: string = 'All Time'
): Promise<ImpactCorrelationMetrics> {
    // 1. Calculate overall macro totals within time window
    const overallRes = await pool.query(`
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE sentiment_label ILIKE 'negative') as total_negative,
            COUNT(*) FILTER (WHERE sentiment_label ILIKE 'positive') as total_positive,
            COUNT(*) FILTER (WHERE sentiment_label ILIKE 'neutral') as total_neutral,
            COUNT(*) FILTER (WHERE priority_label ILIKE '%high%') as total_high_priority,
            AVG(NULLIF(rating, '')::numeric) as avg_rating
        FROM feedbacks
        WHERE product_id = $1
          AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
    `, [productId, startDate, endDate]);

    const overall = overallRes.rows[0];
    const totalFeedback = parseInt(overall.total, 10) || 0;
    const totalNegative = parseInt(overall.total_negative, 10) || 0;
    const totalPositive = parseInt(overall.total_positive, 10) || 0;
    const totalNeutral = parseInt(overall.total_neutral, 10) || 0;
    const totalHighPriority = parseInt(overall.total_high_priority, 10) || 0;
    const avgRating = parseFloat(overall.avg_rating) || 0;

    // 2. Unnest multi-category array within time window
    const catRes = await pool.query(`
        SELECT 
            cat,
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE sentiment_label ILIKE 'negative') as neg_count,
            COUNT(*) FILTER (WHERE sentiment_label ILIKE 'positive') as pos_count,
            COUNT(*) FILTER (WHERE priority_label ILIKE '%high%') as high_priority_count
        FROM (
            SELECT 
                unnest(COALESCE(categories, ARRAY[category_name])) as cat,
                sentiment_label,
                priority_label
            FROM feedbacks
            WHERE product_id = $1
              AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
              AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
        ) sub
        WHERE cat IS NOT NULL AND cat <> ''
        GROUP BY cat
        ORDER BY neg_count DESC, high_priority_count DESC, total_count DESC
    `, [productId, startDate, endDate]);

    const categories: CategoryCorrelation[] = catRes.rows.map(row => {
        const negCount = parseInt(row.neg_count, 10);
        const highCount = parseInt(row.high_priority_count, 10);
        const totalCount = parseInt(row.total_count, 10);
        return {
            category: row.cat,
            total_count: totalCount,
            neg_count: negCount,
            pos_count: parseInt(row.pos_count, 10),
            high_priority_count: highCount,
            neg_share_percent: totalNegative > 0 ? (negCount / totalNegative) * 100 : 0,
            high_priority_share_percent: totalHighPriority > 0 ? (highCount / totalHighPriority) * 100 : 0
        };
    });

    const primaryCulprit = categories[0] || {
        category: 'General',
        neg_count: 0,
        neg_share_percent: 0,
        high_priority_share_percent: 0
    };

    let quantifiedImpactStatement = '';
    if (totalNegative > 0 && primaryCulprit.neg_count > 0) {
        quantifiedImpactStatement = `Category "${primaryCulprit.category}" is the #1 driver of customer dissatisfaction, accounting for ${primaryCulprit.neg_share_percent.toFixed(1)}% of negative sentiment and ${primaryCulprit.high_priority_share_percent.toFixed(1)}% of high-priority complaints.`;
    } else if (totalFeedback > 0) {
        quantifiedImpactStatement = `Customer sentiment is predominantly positive or stable across all categories.`;
    } else {
        quantifiedImpactStatement = `No feedback recorded yet.`;
    }

    return {
        total_feedback: totalFeedback,
        total_negative: totalNegative,
        total_positive: totalPositive,
        total_neutral: totalNeutral,
        total_high_priority: totalHighPriority,
        average_rating: avgRating,
        primary_culprit_category: primaryCulprit.category,
        primary_culprit_neg_share: primaryCulprit.neg_share_percent,
        primary_culprit_high_priority_share: primaryCulprit.high_priority_share_percent,
        quantified_impact_statement: quantifiedImpactStatement,
        categories,
        period_key: periodKey,
        period_label: periodLabel
    };
}

/**
 * Fetches recent feedback context within time window for synthesis
 */
async function getFeedbackSamples(
    productId: string,
    pool: Pool,
    limit = 20,
    startDate: Date | null = null,
    endDate: Date | null = null
) {
    const res = await pool.query(`
        SELECT 
            feedback,
            rating,
            sentiment_label,
            priority_label,
            categories,
            raw_ai_metadata->>'summary' as summary,
            raw_ai_metadata->>'root_cause' as root_cause,
            raw_ai_metadata->'action_items' as action_items,
            created_at
        FROM feedbacks
        WHERE product_id = $1
          AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR created_at <= $3::timestamptz)
        ORDER BY 
            CASE WHEN priority_label ILIKE '%high%' THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT $4
    `, [productId, startDate, endDate, limit]);

    return res.rows;
}

/**
 * Generates or retrieves cached Executive Operational Brief with Period Support
 */
export async function getOrGenerateExecutiveBrief(
    productId: string,
    pool: Pool,
    forceRefresh = false,
    period = 'all',
    customStart?: string,
    customEnd?: string
): Promise<{ brief: ExecutiveBrief; metrics: ImpactCorrelationMetrics }> {
    const { periodKey, startDate, endDate, periodLabel } = parsePeriodBounds(period, customStart, customEnd);

    // 1. Calculate latest real-time metrics for this specific period
    const metrics = await calculateImpactCorrelation(productId, pool, startDate, endDate, periodKey, periodLabel);

    if (metrics.total_feedback === 0) {
        return {
            brief: {
                headline: `No Feedback in ${periodLabel}`,
                macro_health_status: 'Stable',
                executive_summary: `No customer feedback was submitted during the selected period (${periodLabel}). Select another timeframe or collect more feedback to view operational insights.`,
                impact_correlation: {
                    primary_culprit_category: 'None',
                    quantified_impact_statement: `Zero complaints recorded in ${periodLabel}.`,
                    root_cause_diagnosis: 'No submissions in this timeframe.'
                },
                top_strategic_decisions: [],
                strengths_to_reinforce: [],
                period_key: periodKey,
                period_label: periodLabel,
                generated_at: new Date().toISOString(),
                is_cached: false
            },
            metrics
        };
    }

    // 2. Check Database Cache tagged by periodKey if forceRefresh is false
    if (!forceRefresh) {
        const cacheRes = await pool.query(`
            SELECT brief, metrics, created_at, feedback_count_at_generation
            FROM executive_briefs
            WHERE product_id = $1 AND period_key = $2
            ORDER BY created_at DESC
            LIMIT 1
        `, [productId, periodKey]);

        if (cacheRes.rows.length > 0) {
            const cachedRow = cacheRes.rows[0];
            const cachedBrief: ExecutiveBrief = {
                ...cachedRow.brief,
                period_key: periodKey,
                period_label: periodLabel,
                generated_at: cachedRow.created_at,
                is_cached: true
            };
            return {
                brief: cachedBrief,
                metrics: cachedRow.metrics || metrics
            };
        }
    }

    // 3. Fetch Product Metadata
    const prodRes = await pool.query('SELECT name, industry, description FROM products WHERE id = $1', [productId]);
    const product = prodRes.rows[0] || { name: 'Product', industry: 'General', description: '' };

    // 4. Fetch Sample Feedbacks for the selected timeframe
    const sampleFeedbacks = await getFeedbackSamples(productId, pool, 20, startDate, endDate);

    // 5. Synthesize Brief with Gemini AI (with retries & heuristic fallback)
    const synthesizedBrief = await synthesizeWithGemini(product, metrics, sampleFeedbacks, periodLabel);

    // 6. Store in Database Cache with period_key and date boundaries
    try {
        await pool.query(`
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
            productId,
            periodKey,
            startDate,
            endDate,
            JSON.stringify(synthesizedBrief),
            JSON.stringify(metrics),
            metrics.total_feedback
        ]);
    } catch (saveErr) {
        console.error('Failed to cache executive brief in DB:', saveErr);
    }

    return {
        brief: {
            ...synthesizedBrief,
            period_key: periodKey,
            period_label: periodLabel,
            generated_at: new Date().toISOString(),
            is_cached: false
        },
        metrics
    };
}

/**
 * Invokes Gemini 2.5 Flash to synthesize macro strategic brief
 */
async function synthesizeWithGemini(
    product: { name: string; industry: string; description: string },
    metrics: ImpactCorrelationMetrics,
    feedbacks: any[],
    periodLabel: string
): Promise<Omit<ExecutiveBrief, 'generated_at' | 'is_cached' | 'period_key' | 'period_label'>> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return generateFallbackBrief(product, metrics, feedbacks, periodLabel);
    }

    const ai = new GoogleGenAI({ apiKey });

    const feedbackSummaries = feedbacks.map((f, i) => {
        return `${i + 1}. [Rating: ${f.rating || 'N/A'}/5] [${f.sentiment_label}] [${f.priority_label}] Categories: [${(f.categories || []).join(', ')}]
Text: "${f.feedback}"
Root Cause: ${f.root_cause || 'N/A'}`;
    }).join('\n\n');

    const prompt = `You are a Chief Operating Officer (COO) and Executive Strategy AI.
Synthesize an Executive Macro Operational Brief for the leadership of:
- Organization/Product: ${product.name}
- Industry: ${product.industry}
- Overview: ${product.description || 'N/A'}
- Time Window Analyzed: ${periodLabel}

REAL-TIME AGGREGATED METRICS FOR THIS PERIOD (${periodLabel}):
- Total Customer Feedbacks: ${metrics.total_feedback}
- Negative Sentiment Volume: ${metrics.total_negative} (${((metrics.total_negative / (metrics.total_feedback || 1)) * 100).toFixed(1)}%)
- Positive Sentiment Volume: ${metrics.total_positive} (${((metrics.total_positive / (metrics.total_feedback || 1)) * 100).toFixed(1)}%)
- High Priority Issues: ${metrics.total_high_priority}
- Average Rating: ${metrics.average_rating.toFixed(1)} / 5.0
- Impact Correlation: ${metrics.quantified_impact_statement}

TOP CATEGORIES BY NEGATIVE VOLUME IN THIS PERIOD:
${metrics.categories.map(c => `- ${c.category}: ${c.neg_count} negative feedbacks (${c.neg_share_percent.toFixed(1)}% of period negative complaints), ${c.high_priority_count} high-priority`).join('\n')}

REPRESENTATIVE FEEDBACKS IN THIS PERIOD:
${feedbackSummaries}

TASK:
Synthesize an authoritative, executive-level Operational Brief tailored to this timeframe (${periodLabel}):
1. Headline: A compelling, news-style executive one-liner reflecting this period.
2. Macro Health Status: 'Critical Alert', 'Action Required', 'Stable', or 'Healthy'.
3. Executive Summary: 2-3 sentences providing high-altitude macro synthesis for executives.
4. Impact Correlation:
   - Primary culprit category in this period.
   - Exact quantified impact statement.
   - Root-cause diagnosis explaining WHY this bottleneck occurred.
5. Top 3 Strategic Decisions: Exactly 3 high-leverage, concrete operational decisions for management. Must specify department, urgency, operational action, and projected ROI / outcome.
6. Strengths to Reinforce: 2-3 key positive practices or staff behaviors highlighted in positive reviews during this period.`;

    // Try up to 2 attempts for resilience
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            headline: { type: Type.STRING },
                            macroHealthStatus: {
                                type: Type.STRING,
                                enum: ['Critical Alert', 'Action Required', 'Stable', 'Healthy']
                            },
                            executiveSummary: { type: Type.STRING },
                            impactCorrelation: {
                                type: Type.OBJECT,
                                properties: {
                                    primaryCulpritCategory: { type: Type.STRING },
                                    quantifiedImpactStatement: { type: Type.STRING },
                                    rootCauseDiagnosis: { type: Type.STRING }
                                },
                                required: ['primaryCulpritCategory', 'quantifiedImpactStatement', 'rootCauseDiagnosis']
                            },
                            topStrategicDecisions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        rank: { type: Type.INTEGER },
                                        title: { type: Type.STRING },
                                        departmentOrArea: { type: Type.STRING },
                                        urgency: {
                                            type: Type.STRING,
                                            enum: ['Immediate (24-48h)', 'Short-Term (1-2 Weeks)', 'Strategic / Policy']
                                        },
                                        decision: { type: Type.STRING },
                                        expectedRoiOrImpact: { type: Type.STRING }
                                    },
                                    required: ['rank', 'title', 'departmentOrArea', 'urgency', 'decision', 'expectedRoiOrImpact']
                                }
                            },
                            strengthsToReinforce: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['headline', 'macroHealthStatus', 'executiveSummary', 'impactCorrelation', 'topStrategicDecisions', 'strengthsToReinforce']
                    }
                }
            });

            const parsed = JSON.parse(response.text || '{}');
            return {
                headline: parsed.headline || `${metrics.primary_culprit_category} Identified as Core Operational Bottleneck in ${periodLabel}`,
                macro_health_status: parsed.macroHealthStatus || (metrics.total_high_priority > 2 ? 'Action Required' : 'Stable'),
                executive_summary: parsed.executiveSummary || metrics.quantified_impact_statement,
                impact_correlation: {
                    primary_culprit_category: parsed.impactCorrelation?.primaryCulpritCategory || metrics.primary_culprit_category,
                    quantified_impact_statement: parsed.impactCorrelation?.quantifiedImpactStatement || metrics.quantified_impact_statement,
                    root_cause_diagnosis: parsed.impactCorrelation?.rootCauseDiagnosis || 'Operational throughput limitations and inter-departmental handoff delays.'
                },
                top_strategic_decisions: (parsed.topStrategicDecisions || []).map((d: any, idx: number) => ({
                    rank: d.rank || idx + 1,
                    title: d.title || `Operational Optimization #${idx + 1}`,
                    department_or_area: d.departmentOrArea || product.industry,
                    urgency: d.urgency || 'Immediate (24-48h)',
                    decision: d.decision || '',
                    expected_roi_or_impact: d.expectedRoiOrImpact || 'Improves customer satisfaction and retention.'
                })),
                strengths_to_reinforce: parsed.strengthsToReinforce || ['High-quality individual care provided by frontline professionals.']
            };
        } catch (err: any) {
            console.warn(`Gemini brief attempt ${attempt} failed:`, err.message);
            if (attempt === 1) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    return generateFallbackBrief(product, metrics, feedbacks, periodLabel);
}

/**
 * Deterministic fallback brief
 */
function generateFallbackBrief(
    product: { name: string; industry: string },
    metrics: ImpactCorrelationMetrics,
    feedbacks: any[],
    periodLabel: string
): Omit<ExecutiveBrief, 'generated_at' | 'is_cached' | 'period_key' | 'period_label'> {
    const isCritical = metrics.total_high_priority > 3 || (metrics.total_negative / (metrics.total_feedback || 1)) > 0.4;
    const topCulprit = metrics.primary_culprit_category;

    const actionItems: string[] = [];
    feedbacks.forEach(f => {
        if (Array.isArray(f.action_items)) {
            f.action_items.forEach((item: string) => {
                if (item && !actionItems.includes(item)) actionItems.push(item);
            });
        }
    });

    return {
        headline: `${topCulprit} Emerges as Primary Bottleneck for ${product.name} (${periodLabel})`,
        macro_health_status: isCritical ? 'Action Required' : 'Stable',
        executive_summary: `During ${periodLabel}, ${metrics.total_feedback} feedbacks were analyzed with ${metrics.total_negative} negative issues. Addressing ${topCulprit} offers the greatest leverage for operational improvement.`,
        impact_correlation: {
            primary_culprit_category: topCulprit,
            quantified_impact_statement: metrics.quantified_impact_statement,
            root_cause_diagnosis: `Process bottlenecks and resource constraints in ${topCulprit} directly account for ${metrics.primary_culprit_neg_share.toFixed(0)}% of negative sentiment.`
        },
        top_strategic_decisions: [
            {
                rank: 1,
                title: `Address ${topCulprit} Bottlenecks`,
                department_or_area: `${topCulprit} Operations`,
                urgency: 'Immediate (24-48h)',
                decision: actionItems[0] || `Audit operational workflows and staffing allocations surrounding ${topCulprit}.`,
                expected_roi_or_impact: `Eliminates up to ${metrics.primary_culprit_neg_share.toFixed(0)}% of incoming customer friction.`
            },
            {
                rank: 2,
                title: 'Inter-departmental Coordination Review',
                department_or_area: 'Operational Management',
                urgency: 'Short-Term (1-2 Weeks)',
                decision: actionItems[1] || 'Establish standardized escalation protocols and maximum customer wait thresholds.',
                expected_roi_or_impact: 'Prevents service breakdown and unaddressed escalation.'
            },
            {
                rank: 3,
                title: 'Close Feedback Loop with Affected Customers',
                department_or_area: 'Customer Relations',
                urgency: 'Immediate (24-48h)',
                decision: 'Proactively contact high-priority dissatisfied customers with service recovery vouchers.',
                expected_roi_or_impact: 'Protects public reputation and reduces customer churn by ~30%.'
            }
        ],
        strengths_to_reinforce: [
            'Empathetic and compassionate interactions consistently recognized by satisfied customers.',
            'Maintain high standards in departments receiving positive customer ratings.'
        ]
    };
}

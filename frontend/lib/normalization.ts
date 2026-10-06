import { BackendFeedback, Feedback, Priority, RootCauseHypothesis, Sentiment } from '@/types';

/**
 * Extracts a clean string label from a string or { label: string } object.
 */
function extractLabel(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value !== null && 'label' in value && typeof (value as any).label === 'string') {
        return (value as any).label.trim();
    }
    return '';
}

/**
 * Normalizes sentiment value to 'positive' | 'negative' | 'neutral' | 'mixed'.
 */
export function normalizeSentiment(value: unknown): Sentiment {
    const raw = extractLabel(value).toLowerCase();
    if (raw.includes('mix')) return 'mixed';
    if (raw.includes('pos')) return 'positive';
    if (raw.includes('neg')) return 'negative';
    return 'neutral';
}

/**
 * Normalizes priority value to 'low' | 'medium' | 'high'.
 */
export function normalizePriority(value: unknown): Priority {
    const raw = extractLabel(value).toLowerCase();
    if (raw.includes('high') || raw.includes('crit') || raw.includes('urg')) return 'high';
    if (raw.includes('low')) return 'low';
    return 'medium';
}

const ANALYZING_STATUSES = new Set(['queued', 'analyzing', 'received', 'pending']);

function isAnalyzingStatus(processingStatus?: string, status?: string): boolean {
    const candidates = [processingStatus, status]
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .map((s) => s.toLowerCase());
    return candidates.some((s) => ANALYZING_STATUSES.has(s));
}

function mapRootCauseHypotheses(raw: BackendFeedback): RootCauseHypothesis[] {
    const meta = raw.raw_ai_metadata;
    const fromMeta = meta?.rootCauseHypotheses;
    if (Array.isArray(fromMeta) && fromMeta.length > 0) {
        return fromMeta
            .filter((h): h is RootCauseHypothesis =>
                !!h && typeof h === 'object' && typeof h.hypothesis === 'string'
            )
            .map((h) => ({
                hypothesis: h.hypothesis,
                confidence: typeof h.confidence === 'string' ? h.confidence : 'medium',
                evidence: Array.isArray(h.evidence)
                    ? h.evidence.filter((e): e is string => typeof e === 'string')
                    : [],
            }));
    }

    // Compat: single root_cause string → one hypothesis
    if (typeof meta?.root_cause === 'string' && meta.root_cause.trim().length > 0) {
        return [{
            hypothesis: meta.root_cause.trim(),
            confidence: 'medium',
            evidence: [],
        }];
    }

    return [];
}

/**
 * Unwraps feedback list payloads that may be a bare array or `{ items }` / `{ data }`.
 */
export function unwrapFeedbackList(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.items)) return obj.items;
        if (Array.isArray(obj.data)) return obj.data;
    }
    return [];
}

/**
 * Normalizes a single backend feedback payload into the frontend Feedback model.
 * Never fabricates AI summaries by truncating raw feedback text.
 */
export function normalizeBackendFeedback(raw: BackendFeedback | null | undefined, fallbackProductId = ''): Feedback {
    if (!raw || typeof raw !== 'object') {
        return {
            id: '',
            productId: fallbackProductId,
            text: '',
            rating: 0,
            email: undefined,
            createdAt: new Date(),
            categories: ['General'],
            category: 'General',
            sentiment: 'neutral',
            impact: 'medium',
            status: 'new',
            processing_status: undefined,
            analysis: {
                sentiment: 'neutral',
                category: 'General',
                categories: ['General'],
                priority: 'medium',
                summary: '',
                aspects: [],
                actionItems: [],
                rootCause: '',
                rootCauseHypotheses: [],
            },
            isAnalyzing: false,
        };
    }

    const id = String(raw.id ?? '');
    const productId = String(raw.product_id ?? fallbackProductId ?? '');
    const text = typeof raw.feedback === 'string' ? raw.feedback : '';
    const rating = raw.rating !== null && raw.rating !== undefined && !isNaN(Number(raw.rating)) ? Number(raw.rating) : 0;
    const email = raw.email ? String(raw.email).trim() : undefined;
    const createdAt = raw.created_at ? new Date(raw.created_at) : new Date();
    const status = typeof raw.status === 'string' ? raw.status : 'new';
    const processing_status = typeof raw.processing_status === 'string' ? raw.processing_status : undefined;
    const impact = typeof raw.impact === 'string' ? raw.impact : 'medium';
    const isAnalyzing = isAnalyzingStatus(processing_status, status);

    // Extract sentiment
    const rawSentiment =
        raw.sentiment_label ||
        raw.sentiment ||
        raw.raw_ai_metadata?.sentiment;
    const sentiment = normalizeSentiment(rawSentiment);

    // Extract priority
    const rawPriority =
        raw.priority_label ||
        raw.priority ||
        raw.raw_ai_metadata?.priority;
    const priority = normalizePriority(rawPriority);

    // Extract category name
    const rawCategory =
        raw.category_name ||
        raw.category ||
        raw.raw_ai_metadata?.category;
    const categoryLabel = extractLabel(rawCategory);
    const category = categoryLabel || 'Uncategorized';

    // Extract categories list
    let categories: string[] = [];
    if (Array.isArray(raw.categories) && raw.categories.length > 0) {
        categories = raw.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
    } else if (Array.isArray(raw.raw_ai_metadata?.categories) && raw.raw_ai_metadata.categories.length > 0) {
        categories = raw.raw_ai_metadata.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
    }
    if (categories.length === 0) {
        categories = [category];
    }

    // Extract genuine AI summary without truncating raw feedback
    let summary = '';
    if (typeof raw.raw_ai_metadata?.summary === 'string' && raw.raw_ai_metadata.summary.trim().length > 0) {
        summary = raw.raw_ai_metadata.summary.trim();
    } else if (typeof raw.raw_ai_metadata?.executiveSummary === 'string' && raw.raw_ai_metadata.executiveSummary.trim().length > 0) {
        summary = raw.raw_ai_metadata.executiveSummary.trim();
    } else if (raw.analysis && typeof raw.analysis === 'object' && typeof (raw.analysis as any).summary === 'string' && (raw.analysis as any).summary.trim().length > 0) {
        summary = (raw.analysis as any).summary.trim();
    }

    // Action items
    const actionItems = Array.isArray(raw.raw_ai_metadata?.action_items)
        ? raw.raw_ai_metadata.action_items.filter((item): item is string => typeof item === 'string')
        : [];

    // Aspects
    const aspects = Array.isArray(raw.raw_ai_metadata?.aspects)
        ? raw.raw_ai_metadata.aspects
        : [];

    const rootCauseHypotheses = mapRootCauseHypotheses(raw);
    const rootCause = rootCauseHypotheses[0]?.hypothesis
        || (typeof raw.raw_ai_metadata?.root_cause === 'string' ? raw.raw_ai_metadata.root_cause : '');

    return {
        id,
        productId,
        text,
        rating,
        email,
        createdAt,
        categories,
        category,
        sentiment,
        impact,
        status,
        processing_status,
        analysis: {
            sentiment,
            category,
            categories,
            priority,
            summary,
            aspects,
            actionItems,
            rootCause,
            rootCauseHypotheses,
        },
        isAnalyzing,
    };
}

/**
 * Normalizes an array of backend feedbacks safely.
 * Accepts bare arrays or `{ items }` / `{ data }` list envelopes.
 */
export function normalizeBackendFeedbacks(rawList: unknown, fallbackProductId = ''): Feedback[] {
    const list = unwrapFeedbackList(rawList);
    return list.map((item) => normalizeBackendFeedback(item as BackendFeedback, fallbackProductId));
}

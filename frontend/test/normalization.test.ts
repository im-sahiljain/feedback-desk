import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    normalizeBackendFeedback,
    normalizeBackendFeedbacks,
    normalizeSentiment,
    normalizePriority
} from '../lib/normalization';
import { BackendFeedback } from '../types';

describe('Feedback Normalization and Type Safety', () => {
    it('should normalize sentiment from various backend structures', () => {
        assert.strictEqual(normalizeSentiment('positive'), 'positive');
        assert.strictEqual(normalizeSentiment('Positive'), 'positive');
        assert.strictEqual(normalizeSentiment({ label: 'Positive', score: 0.95 }), 'positive');
        assert.strictEqual(normalizeSentiment('negative'), 'negative');
        assert.strictEqual(normalizeSentiment({ label: 'Negative', score: 0.88 }), 'negative');
        assert.strictEqual(normalizeSentiment('neutral'), 'neutral');
        assert.strictEqual(normalizeSentiment('mixed'), 'mixed');
        assert.strictEqual(normalizeSentiment('Mixed'), 'mixed');
        assert.strictEqual(normalizeSentiment({ label: 'Mixed', score: 0.7 }), 'mixed');
        assert.strictEqual(normalizeSentiment(null), 'neutral');
        assert.strictEqual(normalizeSentiment(undefined), 'neutral');
    });

    it('should normalize priority from various backend structures', () => {
        assert.strictEqual(normalizePriority('High Priority'), 'high');
        assert.strictEqual(normalizePriority('high'), 'high');
        assert.strictEqual(normalizePriority('Critical'), 'high');
        assert.strictEqual(normalizePriority({ label: 'High Priority', score: 0.9 }), 'high');
        assert.strictEqual(normalizePriority('Low Priority'), 'low');
        assert.strictEqual(normalizePriority('low'), 'low');
        assert.strictEqual(normalizePriority('Medium Priority'), 'medium');
        assert.strictEqual(normalizePriority('medium'), 'medium');
        assert.strictEqual(normalizePriority(null), 'medium');
    });

    it('should never convert missing AI summary into a truncated fake summary', () => {
        const longFeedback = 'This is a very long feedback text that is definitely more than 50 or 70 characters long to test whether substring truncation happens anywhere.';
        const rawFeedback: BackendFeedback = {
            id: 1,
            product_id: 10,
            feedback: longFeedback,
            sentiment_label: 'Negative',
            priority_label: 'High Priority',
            category_name: 'Bug Report',
            // No summary in raw_ai_metadata
            raw_ai_metadata: {
                root_cause: 'Network timeout',
                action_items: ['Fix retry logic']
            }
        };

        const normalized = normalizeBackendFeedback(rawFeedback);
        assert.strictEqual(normalized.text, longFeedback);
        // Summary must NOT be truncated text
        assert.strictEqual(normalized.analysis?.summary, '');
        assert.strictEqual(normalized.analysis?.summary.includes('...'), false);
    });

    it('should preserve genuine AI summary when present in backend response', () => {
        const rawFeedback: BackendFeedback = {
            id: 2,
            product_id: 10,
            feedback: 'Long raw feedback text here...',
            raw_ai_metadata: {
                summary: 'Genuine AI summary describing the core issue.'
            }
        };

        const normalized = normalizeBackendFeedback(rawFeedback);
        assert.strictEqual(normalized.analysis?.summary, 'Genuine AI summary describing the core issue.');
    });

    it('should handle null/undefined and malformed inputs gracefully', () => {
        const emptyNormalized = normalizeBackendFeedback(null);
        assert.strictEqual(emptyNormalized.id, '');
        assert.strictEqual(emptyNormalized.text, '');
        assert.strictEqual(emptyNormalized.analysis?.sentiment, 'neutral');
        assert.strictEqual(emptyNormalized.analysis?.priority, 'medium');

        const arrayNormalized = normalizeBackendFeedbacks(null);
        assert.deepStrictEqual(arrayNormalized, []);

        const nonArrayNormalized = normalizeBackendFeedbacks({ error: 'Internal Server Error' });
        assert.deepStrictEqual(nonArrayNormalized, []);
    });

    it('should correctly map categories and aspects', () => {
        const rawFeedback: BackendFeedback = {
            id: 3,
            product_id: 20,
            feedback: 'The app crashed during checkout and billing was charged twice.',
            categories: ['Bug Report', 'Billing'],
            category_name: 'Bug Report',
            raw_ai_metadata: {
                aspects: [
                    { category: 'Bug Report', sentiment: 'negative', severity: 'high', snippet: 'crashed during checkout' },
                    { category: 'Billing', sentiment: 'negative', severity: 'high', snippet: 'charged twice' }
                ],
                action_items: ['Audit checkout transaction rollback'],
                root_cause: 'Database transaction lock conflict'
            }
        };

        const normalized = normalizeBackendFeedback(rawFeedback);
        assert.deepStrictEqual(normalized.categories, ['Bug Report', 'Billing']);
        assert.strictEqual(normalized.category, 'Bug Report');
        assert.strictEqual(normalized.analysis?.aspects?.length, 2);
        assert.strictEqual(normalized.analysis?.actionItems?.[0], 'Audit checkout transaction rollback');
        assert.strictEqual(normalized.analysis?.rootCause, 'Database transaction lock conflict');
        assert.strictEqual(normalized.analysis?.rootCauseHypotheses?.[0]?.hypothesis, 'Database transaction lock conflict');
    });

    it('should map rootCauseHypotheses and unwrap { items } list envelopes', () => {
        const rawFeedback: BackendFeedback = {
            id: 4,
            product_id: 20,
            feedback: 'Checkout is slow but support was helpful.',
            sentiment_label: 'Mixed',
            processing_status: 'queued',
            raw_ai_metadata: {
                rootCauseHypotheses: [
                    {
                        hypothesis: 'Payment gateway latency under peak load',
                        confidence: 'high',
                        evidence: ['slow checkout', 'timeout mentions'],
                    },
                ],
            },
        };

        const normalized = normalizeBackendFeedback(rawFeedback);
        assert.strictEqual(normalized.sentiment, 'mixed');
        assert.strictEqual(normalized.isAnalyzing, true);
        assert.strictEqual(normalized.analysis?.rootCause, 'Payment gateway latency under peak load');
        assert.strictEqual(normalized.analysis?.rootCauseHypotheses?.[0]?.confidence, 'high');

        const fromItems = normalizeBackendFeedbacks({ items: [rawFeedback] });
        assert.strictEqual(fromItems.length, 1);
        assert.strictEqual(fromItems[0].id, '4');

        const fromData = normalizeBackendFeedbacks({ data: [rawFeedback] });
        assert.strictEqual(fromData.length, 1);
    });
});

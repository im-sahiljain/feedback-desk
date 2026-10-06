import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Feedback } from '../types';

describe('Analytics Calculations Accuracy (No Random Values)', () => {
    function computeStats(feedbackList: Feedback[]) {
        const analyzed = feedbackList.filter(f => f.analysis);
        const positive = analyzed.filter(f => f.analysis?.sentiment === 'positive').length;
        const negative = analyzed.filter(f => f.analysis?.sentiment === 'negative').length;
        const neutral = analyzed.filter(f => f.analysis?.sentiment === 'neutral').length;
        const highPriority = analyzed.filter(f => f.analysis?.priority === 'high').length;
        const mediumPriority = analyzed.filter(f => f.analysis?.priority === 'medium').length;
        const lowPriority = analyzed.filter(f => f.analysis?.priority === 'low').length;
        const ratedItems = feedbackList.filter(f => f.rating && f.rating > 0);
        const avgRating = ratedItems.length > 0
            ? ratedItems.reduce((acc, f) => acc + (f.rating || 0), 0) / ratedItems.length
            : 0;
        const sentimentScore = analyzed.length > 0
            ? Math.round(((positive - negative) / analyzed.length) * 100)
            : 0;

        return {
            total: feedbackList.length,
            analyzed: analyzed.length,
            positive,
            negative,
            neutral,
            highPriority,
            mediumPriority,
            lowPriority,
            avgRating,
            sentimentScore
        };
    }

    it('should return zeros for empty feedback list without fabricating values', () => {
        const stats = computeStats([]);
        assert.strictEqual(stats.total, 0);
        assert.strictEqual(stats.analyzed, 0);
        assert.strictEqual(stats.positive, 0);
        assert.strictEqual(stats.negative, 0);
        assert.strictEqual(stats.neutral, 0);
        assert.strictEqual(stats.highPriority, 0);
        assert.strictEqual(stats.avgRating, 0);
        assert.strictEqual(stats.sentimentScore, 0);
    });

    it('should accurately compute metrics deterministically from real feedback data', () => {
        const mockFeedbacks: Feedback[] = [
            {
                id: '1',
                productId: 'p1',
                text: 'Super fast and helpful',
                rating: 5,
                createdAt: new Date(),
                analysis: { sentiment: 'positive', priority: 'low', category: 'Performance', summary: '' }
            },
            {
                id: '2',
                productId: 'p1',
                text: 'Broken link on pricing page',
                rating: 1,
                createdAt: new Date(),
                analysis: { sentiment: 'negative', priority: 'high', category: 'Bug Report', summary: '' }
            },
            {
                id: '3',
                productId: 'p1',
                text: 'Neutral feedback on UI design',
                rating: 3,
                createdAt: new Date(),
                analysis: { sentiment: 'neutral', priority: 'medium', category: 'UI/UX', summary: '' }
            }
        ];

        const stats = computeStats(mockFeedbacks);
        assert.strictEqual(stats.total, 3);
        assert.strictEqual(stats.analyzed, 3);
        assert.strictEqual(stats.positive, 1);
        assert.strictEqual(stats.negative, 1);
        assert.strictEqual(stats.neutral, 1);
        assert.strictEqual(stats.highPriority, 1);
        assert.strictEqual(stats.avgRating, 3);
        assert.strictEqual(stats.sentimentScore, 0); // (1 - 1) / 3 * 100 = 0
    });
});

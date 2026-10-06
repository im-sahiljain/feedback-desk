import { describe, it } from 'node:test';
import assert from 'node:assert';
import { signParams, verifyParams } from '../lib/crypto';
import { POST } from '../app/api/feedbacks/submit/route';

describe('Public Feedback Submission Validation', () => {
    const testSecret = 'db1b8f978a243f759f862b8beb592e7d3da9cfa37901961a2d7c9a49a4bc6877';
    process.env.LINK_SECRET = testSecret;

    const validParams = {
        productId: 'prod_10',
        userId: '1',
        industry: 'tech'
    };
    const validSignature = signParams(validParams, testSecret);

    it('should reject missing validation parameters or signature with 400', async () => {
        const req = new Request('http://localhost:3000/api/feedbacks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feedback: 'Great app!',
                productId: 'prod_10'
                // missing userId, industry, signature
            })
        });

        const res = await POST(req);
        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.match(data.message, /Missing required validation parameters/);
    });

    it('should reject empty feedback text with 400', async () => {
        const req = new Request('http://localhost:3000/api/feedbacks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...validParams,
                signature: validSignature,
                feedback: '   '
            })
        });

        const res = await POST(req);
        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.match(data.message, /Feedback text is required/);
    });

    it('should reject invalid or tampered signature with 403', async () => {
        const req = new Request('http://localhost:3000/api/feedbacks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...validParams,
                productId: 'prod_tampered',
                signature: validSignature,
                feedback: 'Some feedback'
            })
        });

        const res = await POST(req);
        assert.strictEqual(res.status, 403);
        const data = await res.json();
        assert.match(data.message, /Invalid or tampered feedback link signature/);
    });

    it('should reject fake signature with 403', async () => {
        const req = new Request('http://localhost:3000/api/feedbacks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...validParams,
                signature: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
                feedback: 'Some feedback'
            })
        });

        const res = await POST(req);
        assert.strictEqual(res.status, 403);
    });

    it('should reject malformed JSON with 400', async () => {
        const req = new Request('http://localhost:3000/api/feedbacks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid-json'
        });

        const res = await POST(req);
        assert.strictEqual(res.status, 400);
    });
});

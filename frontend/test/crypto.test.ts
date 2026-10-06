import { describe, it } from 'node:test';
import assert from 'node:assert';
import { signParams, verifyParams } from '../lib/crypto';

describe('HMAC Crypto Signing and Verification', () => {
    const testSecret = 'test-secret-key-1234567890123456';
    const params = {
        productId: 'prod_123',
        userId: 'user_456',
        industry: 'tech'
    };

    it('should generate a 64-character hex signature', () => {
        const sig = signParams(params, testSecret);
        assert.strictEqual(typeof sig, 'string');
        assert.strictEqual(sig.length, 64);
        assert.match(sig, /^[0-9a-f]{64}$/);
    });

    it('should verify a valid signature correctly', () => {
        const sig = signParams(params, testSecret);
        const isValid = verifyParams(params, sig, testSecret);
        assert.strictEqual(isValid, true);
    });

    it('should reject tampered parameters', () => {
        const sig = signParams(params, testSecret);
        const tamperedParams = { ...params, productId: 'prod_999' };
        const isValid = verifyParams(tamperedParams, sig, testSecret);
        assert.strictEqual(isValid, false);
    });

    it('should reject modified industry parameter', () => {
        const sig = signParams(params, testSecret);
        const tamperedParams = { ...params, industry: 'healthcare' };
        const isValid = verifyParams(tamperedParams, sig, testSecret);
        assert.strictEqual(isValid, false);
    });

    it('should reject invalid signature string', () => {
        const invalidSig = 'a'.repeat(64);
        const isValid = verifyParams(params, invalidSig, testSecret);
        assert.strictEqual(isValid, false);
    });

    it('should reject wrong-length signature without throwing', () => {
        const wrongLengthSig = 'abcd1234';
        const isValid = verifyParams(params, wrongLengthSig, testSecret);
        assert.strictEqual(isValid, false);
    });

    it('should reject missing, null, or undefined signature safely', () => {
        assert.strictEqual(verifyParams(params, '', testSecret), false);
        assert.strictEqual(verifyParams(params, null as any, testSecret), false);
        assert.strictEqual(verifyParams(params, undefined as any, testSecret), false);
    });

    it('should reject non-hex signature safely', () => {
        const nonHexSig = 'z'.repeat(64);
        assert.strictEqual(verifyParams(params, nonHexSig, testSecret), false);
    });

    it('should fail clearly when LINK_SECRET is missing and no secret provided', () => {
        const origSecret = process.env.LINK_SECRET;
        delete process.env.LINK_SECRET;
        try {
            assert.throws(() => {
                signParams(params);
            }, /LINK_SECRET environment variable is not configured/);
        } finally {
            if (origSecret) {
                process.env.LINK_SECRET = origSecret;
            }
        }
    });
});

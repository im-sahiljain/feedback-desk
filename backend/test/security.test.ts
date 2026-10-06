import test from 'node:test';
import assert from 'node:assert/strict';

// Test secrets must be set BEFORE importing modules that read config
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-enough-length-32';
process.env.OTP_HMAC_SECRET = 'test-otp-hmac-secret-enough-len-32';
process.env.LINK_SECRET = 'test-link-secret-with-enough-len-32';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://feedback:feedback@localhost:5432/feedback_desk_test';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();

const { signParams, verifyParams } = await import('../src/crypto.js');
const { generateOtp, generateToken, hashOtp, verifyOtpHash, hashRefreshToken, generatePublicToken } =
  await import('../src/security/crypto.js');
const { signAccessToken, verifyAccessToken } = await import('../src/security/tokens.js');
const { sanitizeForAi } = await import('../src/ai/sanitize.js');
const { sanitizeImpactClaim } = await import('../src/executive_brief.js');
const { roleHasPermission } = await import('../src/organizations/roles.js');
const { toQualitativeConfidence } = await import('../src/ai/types.js');

test('config fails closed without JWT_SECRET', () => {
  resetConfigCache();
  const prev = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  assert.throws(() => loadConfig({ ...process.env, JWT_SECRET: '' }), /JWT_SECRET/);
  process.env.JWT_SECRET = prev;
  resetConfigCache();
  loadConfig();
});

test('HMAC link signing', () => {
  const secret = 'test-backend-production-secret-12345';
  const params = { productId: 'prod_99', userId: 'user_88', industry: 'ecommerce' };
  const signature = signParams(params, secret);
  assert.equal(signature.length, 64);
  assert.equal(verifyParams(params, signature, secret), true);
  assert.equal(verifyParams({ ...params, industry: 'healthcare' }, signature, secret), false);
});

test('OTP crypto', () => {
  const otp = generateOtp();
  assert.match(otp, /^\d{6}$/);
  const challengeId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const hashed = hashOtp('123456', challengeId);
  assert.equal(verifyOtpHash('123456', challengeId, hashed), true);
  assert.equal(verifyOtpHash('654321', challengeId, hashed), false);
  assert.equal(verifyOtpHash('123456', 'other-id', hashed), false);
});

test('tokens', () => {
  const token = signAccessToken({ userId: 'usr_1', sessionId: 'ses_1' });
  const claims = verifyAccessToken(token);
  assert.equal(claims.userId, 'usr_1');
  assert.equal(claims.sessionId, 'ses_1');
  assert.throws(() => verifyAccessToken('invalid.token.here'));
  const refresh = generateToken();
  assert.ok(refresh.length >= 48);
  assert.equal(hashRefreshToken(refresh).length, 64);
  assert.ok(generatePublicToken().length >= 20);
});

test('PII sanitization', () => {
  const input =
    'Contact me at jane.doe@example.com or +1-555-123-4567. Order #ABC12345 and card 4111-1111-1111-1111. token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb';
  const { sanitized, redactions } = sanitizeForAi(input);
  assert.equal(sanitized.includes('jane.doe@example.com'), false);
  assert.equal(sanitized.includes('[EMAIL]'), true);
  assert.equal(redactions.includes('email'), true);
  assert.equal(sanitized.includes('4111-1111-1111-1111'), false);
  assert.equal(sanitized.includes('[CARD]'), true);
});

test('no fabricated business claims', () => {
  const cleaned = sanitizeImpactClaim('This reduces churn by ~30% and increases revenue by 15%.');
  assert.ok(!/30%/.test(cleaned) || /not quantifiable/i.test(cleaned));
  assert.ok(!/increases revenue by 15%/i.test(cleaned));
});

test('RBAC permissions', () => {
  assert.equal(roleHasPermission('analyst', 'feedback:read'), true);
  assert.equal(roleHasPermission('analyst', 'feedback:delete'), false);
  assert.equal(roleHasPermission('owner', 'org:delete'), true);
  assert.equal(roleHasPermission('member', 'public_link:manage'), false);
  assert.equal(roleHasPermission('admin', 'public_link:manage'), true);
});

test('qualitative confidence only', () => {
  assert.equal(toQualitativeConfidence('high'), 'high');
  assert.equal(toQualitativeConfidence(0.9), 'high');
  assert.equal(toQualitativeConfidence(0.4), 'low');
});

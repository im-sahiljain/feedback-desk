import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-32';
process.env.OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'test-otp-hmac-secret-enough-len-32';
process.env.LINK_SECRET = process.env.LINK_SECRET || 'test-link-secret-with-enough-len-32';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://feedback:feedback@localhost:5432/feedback_desk_test';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();

const {
  computeChangeDelta,
  isDashboardPeriod,
  resolveDashboardWindows,
  sentimentDirection,
} = await import('../src/dashboard/summary.js');

test('dashboard periods are restricted to 7d/30d/90d', () => {
  assert.equal(isDashboardPeriod('30d'), true);
  assert.equal(isDashboardPeriod('7d'), true);
  assert.equal(isDashboardPeriod('90d'), true);
  assert.equal(isDashboardPeriod('today'), false);
  assert.equal(isDashboardPeriod('all'), false);
});

test('change delta handles zero previous without infinity', () => {
  const delta = computeChangeDelta(12, 0);
  assert.equal(delta.percent, null);
  assert.equal(delta.direction, 'new');
  assert.equal(delta.display, '12 new');
  assert.equal(delta.meaningful, true);
});

test('change delta handles flat zero', () => {
  const delta = computeChangeDelta(0, 0);
  assert.equal(delta.direction, 'flat');
  assert.equal(delta.meaningful, false);
  assert.equal(delta.display, 'No change');
});

test('change delta computes percent deterministically', () => {
  const delta = computeChangeDelta(142, 100);
  assert.equal(delta.percent, 42);
  assert.equal(delta.direction, 'up');
  assert.equal(delta.display, '↑ 42%');
  assert.equal(delta.meaningful, true);
});

test('small sample growth is not overemphasized as meaningful', () => {
  const delta = computeChangeDelta(2, 1);
  assert.equal(delta.percent, 100);
  assert.equal(delta.smallSample, true);
  assert.equal(delta.meaningful, false);
  assert.equal(delta.display, '1 → 2');
});

test('insignificant noise is not marked meaningful', () => {
  const delta = computeChangeDelta(11, 10);
  assert.equal(delta.percent, 10);
  assert.equal(delta.meaningful, false);
});

test('comparison windows are contiguous and equal length', () => {
  const now = new Date('2026-10-06T12:00:00.000Z');
  const windows = resolveDashboardWindows('30d', now);
  const currentMs = windows.to.getTime() - windows.from.getTime();
  const previousMs = windows.comparisonTo.getTime() - windows.comparisonFrom.getTime();
  assert.equal(windows.comparisonTo.getTime(), windows.from.getTime());
  assert.ok(Math.abs(currentMs - previousMs) < 2);
  assert.ok(windows.comparisonFrom.getTime() < windows.comparisonTo.getTime());
  assert.ok(windows.from.getTime() < windows.to.getTime());
});

test('sentimentDirection returns baseline when previous period has no data but current has enough sample', () => {
  assert.equal(sentimentDirection(46.7, null, 33.3, null, 15), 'baseline');
});

test('sentimentDirection returns insufficient when analyzed is below threshold', () => {
  assert.equal(sentimentDirection(50, 20, 50, 80, 2), 'insufficient');
});

test('sentimentDirection evaluates improving and worsening correctly', () => {
  assert.equal(sentimentDirection(20, 30, 60, 50, 10), 'improving');
  assert.equal(sentimentDirection(35, 20, 40, 55, 10), 'worsening');
  assert.equal(sentimentDirection(20, 20, 50, 50, 10), 'stable');
});


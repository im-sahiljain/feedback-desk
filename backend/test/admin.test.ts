import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-32';
process.env.OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'test-otp-hmac-secret-enough-len-32';
process.env.LINK_SECRET = process.env.LINK_SECRET || 'test-link-secret-with-enough-len-32';
process.env.RESEND_API_KEY = '';

const { getPool } = await import('../src/db.js');
const { signAccessToken } = await import('../src/security/tokens.js');
const adminRouter = (await import('../src/routes/admin.js')).default;

test('FeedbackDesk AI Platform Admin integration tests', async (t) => {
  const pool = getPool();

  // Create test admin user and standard user with random emails (strictly role-based)
  const adminEmail = `admin-${randomUUID().slice(0, 8)}@example.com`;
  const standardEmail = `standard-${randomUUID().slice(0, 8)}@example.com`;

  const adminRes = await pool.query(
    `INSERT INTO users (email, name, role, is_verified, account_status)
     VALUES ($1, 'Admin User', 'admin', TRUE, 'active')
     RETURNING id, email, role`,
    [adminEmail]
  );
  const adminUser = adminRes.rows[0];

  const standardRes = await pool.query(
    `INSERT INTO users (email, name, role, is_verified, account_status)
     VALUES ($1, 'Standard User', 'user', TRUE, 'active')
     RETURNING id, email, role`,
    [standardEmail]
  );
  const standardUser = standardRes.rows[0];

  // Set up Express test app
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    server.close();
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [standardUser.id, adminUser.id]);
  });

  await t.test('rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`);
    assert.equal(res.status, 401);
  });

  await t.test('rejects non-admin user with 403 Forbidden', async () => {
    const token = signAccessToken({ userId: standardUser.id });
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'ADMIN_ACCESS_REQUIRED');
  });

  await t.test('allows admin to fetch platform overview metrics', async () => {
    const token = signAccessToken({ userId: adminUser.id });
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.tenants);
    assert.ok(data.intake);
    assert.ok(data.sentiment);
    assert.ok(data.aiEngine);
    assert.ok(data.queue);
  });

  await t.test('allows admin to fetch AI engine and Gemini observability metrics', async () => {
    const token = signAccessToken({ userId: adminUser.id });
    const res = await fetch(`${baseUrl}/api/admin/ai-metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.observability);
    assert.ok(Array.isArray(data.categoryTaxonomy));
  });

  await t.test('allows admin to inspect distribution and anti-spam shield telemetry', async () => {
    const token = signAccessToken({ userId: adminUser.id });
    const res = await fetch(`${baseUrl}/api/admin/distribution`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.links);
    assert.ok(data.antiSpamShield);
  });

  await t.test('allows admin to list and triage feedbacks', async () => {
    const token = signAccessToken({ userId: adminUser.id });
    const res = await fetch(`${baseUrl}/api/admin/feedbacks?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.feedbacks));
    assert.ok(data.pagination);
  });

  await t.test('allows admin to manage user roles and protects against self-demotion', async () => {
    const token = signAccessToken({ userId: adminUser.id });

    // Promote standard user to demo
    const patchRoleRes = await fetch(`${baseUrl}/api/admin/users/${standardUser.id}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'demo' }),
    });
    assert.equal(patchRoleRes.status, 200);
    const patchRoleData = await patchRoleRes.json();
    assert.equal(patchRoleData.user.role, 'demo');

    // Self-demotion should fail
    const demoteRes = await fetch(`${baseUrl}/api/admin/users/${adminUser.id}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'user' }),
    });
    assert.equal(demoteRes.status, 400);
  });

  await t.test('allows admin to inspect security audit trail', async () => {
    const token = signAccessToken({ userId: adminUser.id });
    const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const logs = await res.json();
    assert.ok(Array.isArray(logs));
  });
});

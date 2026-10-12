import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-32';
process.env.OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'test-otp-hmac-secret-enough-len-32';
process.env.LINK_SECRET = process.env.LINK_SECRET || 'test-link-secret-with-enough-len-32';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();

const { getPool } = await import('../src/db.js');
const {
  createSingleUseInvitation,
  verifyInvitation,
  submitInvitationFeedback,
  dispenseCounterInvitation,
} = await import('../src/publicFeedback/invitations.js');

test('single-use invitations: simple 1-click token creation, submission, and re-submit prevention', async (t) => {
  const pool = getPool();

  // Setup: create a test user and product
  const userRes = await pool.query(
    `INSERT INTO users (email, name, account_status)
     VALUES ($1, 'Test Admin', 'active')
     RETURNING id`,
    [`test-inv-admin-${Date.now()}@example.com`]
  );
  const userId = userRes.rows[0].id;

  const prodRes = await pool.query(
    `INSERT INTO products (user_id, name, industry, description)
     VALUES ($1, 'Simple Single-Use Product', 'tech', 'Testing simplified invitation flow')
     RETURNING id`,
    [userId]
  );
  const productId = prodRes.rows[0].id;

  t.after(async () => {
    // Clean up
    await pool.query(`DELETE FROM products WHERE id = $1`, [productId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  });

  // 1. Create a single-use invitation (1-click, zero customer info)
  const invite = await createSingleUseInvitation(pool, {
    productId,
    createdBy: userId,
  });

  assert.ok(invite.id);
  assert.ok(invite.token);
  assert.match(invite.path, /^\/f\/invite\//);

  // 2. Customer opens link: verify it is active
  const verified = await verifyInvitation(pool, invite.token);
  assert.equal(verified.product.name, 'Simple Single-Use Product');
  assert.equal(verified.token, invite.token);

  // 3. Customer submits feedback: atomically burns the token
  const submitRes = await submitInvitationFeedback(pool, {
    token: invite.token,
    feedback: 'Fantastic and simple! Zero hassle.',
    rating: 5,
  });

  assert.ok(submitRes.feedbackId);

  // 4. Attempt second submission on the same token (Must be rejected with 409 Conflict)
  await assert.rejects(
    async () => {
      await submitInvitationFeedback(pool, {
        token: invite.token,
        feedback: 'Attempting second submission',
        rating: 1,
      });
    },
    (err: any) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /already been submitted/);
      return true;
    }
  );

  // 5. Attempt reopening link in browser (Must be rejected with 410 Gone)
  await assert.rejects(
    async () => {
      await verifyInvitation(pool, invite.token);
    },
    (err: any) => {
      assert.equal(err.status, 410);
      assert.match(err.message, /already been submitted/);
      return true;
    }
  );
});

test('counter QR dispenser: dynamically dispenses single-use tokens from a static product identifier', async (t) => {
  const pool = getPool();

  const userRes = await pool.query(
    `INSERT INTO users (email, name, account_status)
     VALUES ($1, 'Counter Admin', 'active')
     RETURNING id`,
    [`test-counter-admin-${Date.now()}@example.com`]
  );
  const userId = userRes.rows[0].id;

  const prodRes = await pool.query(
    `INSERT INTO products (user_id, name, industry, description)
     VALUES ($1, 'Counter Cafe', 'food', 'Counter feedback stand')
     RETURNING id`,
    [userId]
  );
  const productId = prodRes.rows[0].id;

  t.after(async () => {
    await pool.query(`DELETE FROM products WHERE id = $1`, [productId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  });

  // 1. Customer A scans the static counter QR
  const scanA = await dispenseCounterInvitation(pool, productId);
  assert.ok(scanA.token);
  assert.match(scanA.path, /^\/f\/invite\//);
  assert.equal(scanA.product.name, 'Counter Cafe');

  // Customer A submits review
  const submitA = await submitInvitationFeedback(pool, {
    token: scanA.token,
    feedback: 'Great coffee!',
    rating: 5,
  });
  assert.ok(submitA.feedbackId);

  // 2. Customer B scans the EXACT SAME static counter QR 5 minutes later
  const scanB = await dispenseCounterInvitation(pool, productId);
  assert.ok(scanB.token);
  assert.notEqual(scanB.token, scanA.token, 'Each scan must receive a unique single-use token');

  // Verify scanB is active while scanA is completed
  const verifyB = await verifyInvitation(pool, scanB.token);
  assert.equal(verifyB.token, scanB.token);

  await assert.rejects(
    async () => {
      await verifyInvitation(pool, scanA.token);
    },
    (err: any) => {
      assert.equal(err.status, 410);
      return true;
    }
  );

  // 3. Invalid or non-existent product fails with 404
  await assert.rejects(
    async () => {
      await dispenseCounterInvitation(pool, '00000000-0000-0000-0000-000000000000');
    },
    (err: any) => {
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test('anti-spam: enforces 30-day email cooldown per product even across different invitation tokens', async (t) => {
  const pool = getPool();

  const userRes = await pool.query(
    `INSERT INTO users (email, name, account_status)
     VALUES ($1, 'Spam Guard Admin', 'active')
     RETURNING id`,
    [`test-spam-guard-admin-${Date.now()}@example.com`]
  );
  const userId = userRes.rows[0].id;

  const prodRes = await pool.query(
    `INSERT INTO products (user_id, name, industry, description)
     VALUES ($1, 'Spam Guard Product', 'tech', 'Testing repeat email protection')
     RETURNING id`,
    [userId]
  );
  const productId = prodRes.rows[0].id;

  t.after(async () => {
    await pool.query(`DELETE FROM products WHERE id = $1`, [productId]);
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  });

  const customerEmail = `repeat-customer-${Date.now()}@example.com`;

  // Token 1: generated and submitted by customer
  const invite1 = await createSingleUseInvitation(pool, { productId, createdBy: userId });
  const submit1 = await submitInvitationFeedback(pool, {
    token: invite1.token,
    feedback: 'First legitimate review',
    rating: 5,
    email: customerEmail,
  });
  assert.ok(submit1.feedbackId);

  // Token 2: fresh, unburned token generated later for the same product
  const invite2 = await createSingleUseInvitation(pool, { productId, createdBy: userId });

  // Customer tries submitting with the same email on the second token -> Must be rejected with 409
  await assert.rejects(
    async () => {
      await submitInvitationFeedback(pool, {
        token: invite2.token,
        feedback: 'Second review from same person',
        rating: 1,
        email: customerEmail,
      });
    },
    (err: any) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /already been recorded for this product in the last 30 days/);
      return true;
    }
  );
});

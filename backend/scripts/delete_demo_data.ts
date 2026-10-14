import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function deleteDemoData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const DEMO_EMAIL = 'demo@feedbackdesk.ai';
    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
    
    if (userRes.rows.length === 0) {
      console.log('No demo user found in database.');
      await client.query('ROLLBACK');
      return;
    }

    const userId = userRes.rows[0].id as string;
    console.log(`Found demo user ID: ${userId}`);

    // Get all products owned by demo user
    const prodRes = await client.query('SELECT id FROM products WHERE user_id::text = $1', [userId]);
    const productIds: string[] = prodRes.rows.map((r: { id: string }) => String(r.id));
    console.log(`Found ${productIds.length} demo product(s):`, productIds);

    // Get all feedbacks for demo products
    let feedbackIds: string[] = [];
    if (productIds.length > 0) {
      const fbRes = await client.query('SELECT id FROM feedbacks WHERE product_id::text = ANY($1::text[])', [productIds]);
      feedbackIds = fbRes.rows.map((r: { id: string }) => String(r.id));
      console.log(`Found ${feedbackIds.length} feedback(s) belonging to demo product(s).`);
    }

    // 1. Delete ai_processing_metrics
    if (feedbackIds.length > 0) {
      const delMetrics = await client.query(
        'DELETE FROM ai_processing_metrics WHERE feedback_id::text = ANY($1::text[])',
        [feedbackIds]
      );
      console.log(`Deleted ${delMetrics.rowCount} row(s) from ai_processing_metrics.`);

      // 2. Delete background_jobs referencing these feedbacks
      const delJobs = await client.query(
        "DELETE FROM background_jobs WHERE payload->>'feedbackId' = ANY($1::text[]) OR resource_id::text = ANY($1::text[])",
        [feedbackIds]
      );
      console.log(`Deleted ${delJobs.rowCount} row(s) from background_jobs.`);
    }

    // 3. Delete feedback_invitations
    if (productIds.length > 0) {
      const delInvs = await client.query(
        'DELETE FROM feedback_invitations WHERE product_id::text = ANY($1::text[]) OR created_by::text = $2',
        [productIds, userId]
      );
      console.log(`Deleted ${delInvs.rowCount} row(s) from feedback_invitations.`);

      // 4. Delete executive_briefs
      const delBriefs = await client.query(
        'DELETE FROM executive_briefs WHERE product_id::text = ANY($1::text[])',
        [productIds]
      );
      console.log(`Deleted ${delBriefs.rowCount} row(s) from executive_briefs.`);

      // 5. Delete feedbacks
      const delFb = await client.query(
        'DELETE FROM feedbacks WHERE product_id::text = ANY($1::text[])',
        [productIds]
      );
      console.log(`Deleted ${delFb.rowCount} row(s) from feedbacks.`);

      // 6. Delete products
      const delProd = await client.query(
        'DELETE FROM products WHERE id::text = ANY($1::text[])',
        [productIds]
      );
      console.log(`Deleted ${delProd.rowCount} row(s) from products.`);
    }

    // 7. Delete auth_sessions
    const delSessions = await client.query('DELETE FROM auth_sessions WHERE user_id::text = $1', [userId]);
    console.log(`Deleted ${delSessions.rowCount} row(s) from auth_sessions.`);

    // 8. Delete auth_otp_challenges
    const delOtp = await client.query('DELETE FROM auth_otp_challenges WHERE user_id::text = $1', [userId]);
    console.log(`Deleted ${delOtp.rowCount} row(s) from auth_otp_challenges.`);

    // 9. Delete audit_events
    const delAudit = await client.query('DELETE FROM audit_events WHERE actor_user_id::text = $1', [userId]);
    console.log(`Deleted ${delAudit.rowCount} row(s) from audit_events.`);

    // 10. Delete demo user
    const delUser = await client.query('DELETE FROM users WHERE id::text = $1', [userId]);
    console.log(`Deleted ${delUser.rowCount} row(s) from users.`);

    await client.query('COMMIT');
    console.log('✅ Demo account and all associated data deleted successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to delete demo account data:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteDemoData().catch(console.error);

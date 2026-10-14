import { Pool } from 'pg';
import { logger } from '../logging/logger.js';
import { enqueueJob } from '../jobs/queue.js';
import { JOB_ANALYZE_FEEDBACK } from '../jobs/worker.js';

interface DemoSeedFeedback {
  text: string;
  rating: number;
  daysAgo: number;
}

const SAMPLE_FEEDBACKS: DemoSeedFeedback[] = [
  { text: "The new dashboard looks much cleaner and loads faster than before. Really happy with the update.", rating: 5, daysAgo: 1 },
  { text: "We have an executive demo in one hour and the dashboard is throwing a 500 server error! Please fix immediately.", rating: 1, daysAgo: 2 },
  { text: "Your customer support rep Sarah was extremely patient and solved our billing issue in under 10 minutes.", rating: 5, daysAgo: 2 },
  { text: "The mobile app crashes every time I try to upload more than three screenshots or attachments.", rating: 2, daysAgo: 3 },
  { text: "Please add an option to export reports directly to CSV and Excel. We currently copy everything manually.", rating: 3, daysAgo: 4 },
  { text: "Why was our organization charged twice for the same subscription this billing cycle?", rating: 1, daysAgo: 5 },
  { text: "Search is painfully slow once we have more than a few thousand customer records indexed.", rating: 2, daysAgo: 6 },
  { text: "Love the feedback automation engine! Been using it with our team for 6 months and it saves hours every week.", rating: 5, daysAgo: 7 },
  { text: "The authentication documentation for the webhooks API is outdated. The signature verification code fails.", rating: 2, daysAgo: 8 },
  { text: "Dark mode support would be fantastic for working in low light environments.", rating: 4, daysAgo: 9 },
  { text: "Would love a direct Slack / Discord notification webhook when high-priority feedback arrives.", rating: 5, daysAgo: 10 },
  { text: "The latest update changed the layout of filters we use every day. Took 15 minutes to locate date filters.", rating: 3, daysAgo: 11 },
  { text: "Fantastic platform from onboarding to analytics. Our product managers check this dashboard daily.", rating: 5, daysAgo: 12 },
  { text: "Can we support single sign-on (Google Workspace & Okta SAML) on team plans?", rating: 4, daysAgo: 13 },
  { text: "I accidentally deleted a feedback item. There should be an undo toast or confirmation dialog before deletion.", rating: 3, daysAgo: 14 },
  { text: "Password reset emails take up to 20 minutes to arrive in Outlook inboxes.", rating: 2, daysAgo: 15 },
  { text: "The pricing structure is very transparent and much more affordable than legacy enterprise suites.", rating: 5, daysAgo: 16 },
  { text: "API response latencies spike significantly between 2 PM and 5 PM UTC on weekdays.", rating: 2, daysAgo: 17 },
  { text: "Everything runs smoothly for our 20-person support team. Great product!", rating: 5, daysAgo: 18 },
  { text: "The attention panel highlighted customer churn risks before they escalated. Great AI summary feature.", rating: 5, daysAgo: 19 },
  { text: "Export button gives an empty file when filtering for date ranges longer than 60 days.", rating: 2, daysAgo: 20 },
  { text: "Could you support multiple workspaces under a single company billing account?", rating: 4, daysAgo: 22 },
  { text: "Support response took 3 days for our ticket #4192. Urgent tickets shouldn't wait this long.", rating: 1, daysAgo: 24 },
  { text: "Cleanest feedback aggregation tool we have tried so far. Very responsive UI.", rating: 5, daysAgo: 26 },
  { text: "Page load on the insights tab is a bit sluggish when loading 90-day sentiment trends.", rating: 3, daysAgo: 28 },
];

export async function getOrCreateDemoAccount(pool: Pool): Promise<{
  id: string;
  email: string;
  name: string;
  role: string;
  is_verified: boolean;
  account_status: string;
}> {
  const DEMO_EMAIL = 'demo@feedbackdesk.ai';

  // 1. Check if demo user already exists
  const existingUserRes = await pool.query(
    `SELECT id, email, name, role, is_verified, account_status
     FROM users WHERE email = $1`,
    [DEMO_EMAIL]
  );

  if (existingUserRes.rows.length > 0) {
    const user = existingUserRes.rows[0];
    // Ensure role is 'demo'
    if (user.role !== 'demo') {
      await pool.query(`UPDATE users SET role = 'demo' WHERE id = $1`, [user.id]);
      user.role = 'demo';
    }
    return user;
  }

  logger.info('Initializing Demo Account and Workspace...');

  // 2. Create demo user
  const userInsertRes = await pool.query(
    `INSERT INTO users (email, name, role, is_verified, email_verified_at, last_login_at, account_status)
     VALUES ($1, $2, 'demo', TRUE, now(), now(), 'active')
     RETURNING id, email, name, role, is_verified, account_status`,
    [DEMO_EMAIL, 'Demo Explorer']
  );
  const demoUser = userInsertRes.rows[0];

  // 3. Create demo product
  const productInsertRes = await pool.query(
    `INSERT INTO products (user_id, name, industry, description, settings)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      demoUser.id,
      'Acme Cloud Platform',
      'Software & Technology',
      'Unified cloud operations and team collaboration suite.',
      JSON.stringify({
        categories: ['Bug Report', 'Feature Request', 'Pricing', 'Performance', 'UI/UX', 'Customer Support'],
      }),
    ]
  );
  const demoProductId = productInsertRes.rows[0].id;

  // 4. Seed realistic raw feedbacks (mimicking customer form submissions) and queue for AI analysis
  let index = 0;
  for (const item of SAMPLE_FEEDBACKS) {
    const customerEmail = `customer_${Math.floor(Math.random() * 900 + 100)}@example.com`;

    const fbInsert = await pool.query(
      `INSERT INTO feedbacks (
        product_id, feedback, email, rating, status, processing_status,
        created_at, received_at, queued_at
      ) VALUES (
        $1, $2, $3, $4, 'received', 'queued',
        now() - ($5 || ' days')::interval,
        now() - ($5 || ' days')::interval,
        now()
      ) RETURNING id`,
      [
        demoProductId,
        item.text,
        customerEmail,
        item.rating,
        String(item.daysAgo),
      ]
    );

    const feedbackId = fbInsert.rows[0].id;

    // Space out availableAt by 4.5 seconds per feedback so worker processes safely under 15 RPM
    const availableAt = new Date(Date.now() + index * 4500);

    await enqueueJob(pool, {
      jobType: JOB_ANALYZE_FEEDBACK,
      payload: { feedbackId },
      resourceType: 'feedback',
      resourceId: feedbackId,
      idempotencyKey: `analyze:${feedbackId}`,
      availableAt,
    });

    index++;
  }

  logger.info(`Demo Workspace successfully initialized with ${SAMPLE_FEEDBACKS.length} queued feedbacks for AI analysis.`);
  return demoUser;
}

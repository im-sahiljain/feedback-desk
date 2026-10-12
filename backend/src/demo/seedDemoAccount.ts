import { Pool } from 'pg';
import { logger } from '../logging/logger.js';

interface DemoSeedFeedback {
  text: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
  rating: number;
  daysAgo: number;
}

const SAMPLE_FEEDBACKS: DemoSeedFeedback[] = [
  { text: "The new dashboard looks much cleaner and loads faster than before. Really happy with the update.", sentiment: "Positive", priority: "P3", category: "UI/UX", rating: 5, daysAgo: 1 },
  { text: "We have an executive demo in one hour and the dashboard is throwing a 500 server error! Please fix immediately.", sentiment: "Negative", priority: "P0", category: "Bug Report", rating: 1, daysAgo: 2 },
  { text: "Your customer support rep Sarah was extremely patient and solved our billing issue in under 10 minutes.", sentiment: "Positive", priority: "P3", category: "Customer Support", rating: 5, daysAgo: 2 },
  { text: "The mobile app crashes every time I try to upload more than three screenshots or attachments.", sentiment: "Negative", priority: "P1", category: "Bug Report", rating: 2, daysAgo: 3 },
  { text: "Please add an option to export reports directly to CSV and Excel. We currently copy everything manually.", sentiment: "Neutral", priority: "P2", category: "Feature Request", rating: 3, daysAgo: 4 },
  { text: "Why was our organization charged twice for the same subscription this billing cycle?", sentiment: "Negative", priority: "P1", category: "Pricing", rating: 1, daysAgo: 5 },
  { text: "Search is painfully slow once we have more than a few thousand customer records indexed.", sentiment: "Negative", priority: "P2", category: "Performance", rating: 2, daysAgo: 6 },
  { text: "Love the feedback automation engine! Been using it with our team for 6 months and it saves hours every week.", sentiment: "Positive", priority: "P3", category: "Feature Request", rating: 5, daysAgo: 7 },
  { text: "The authentication documentation for the webhooks API is outdated. The signature verification code fails.", sentiment: "Negative", priority: "P2", category: "Bug Report", rating: 2, daysAgo: 8 },
  { text: "Dark mode support would be fantastic for working in low light environments.", sentiment: "Neutral", priority: "P3", category: "UI/UX", rating: 4, daysAgo: 9 },
  { text: "Would love a direct Slack / Discord notification webhook when high-priority feedback arrives.", sentiment: "Positive", priority: "P2", category: "Feature Request", rating: 5, daysAgo: 10 },
  { text: "The latest update changed the layout of filters we use every day. Took 15 minutes to locate date filters.", sentiment: "Neutral", priority: "P3", category: "UI/UX", rating: 3, daysAgo: 11 },
  { text: "Fantastic platform from onboarding to analytics. Our product managers check this dashboard daily.", sentiment: "Positive", priority: "P3", category: "UI/UX", rating: 5, daysAgo: 12 },
  { text: "Can we support single sign-on (Google Workspace & Okta SAML) on team plans?", sentiment: "Neutral", priority: "P2", category: "Feature Request", rating: 4, daysAgo: 13 },
  { text: "I accidentally deleted a feedback item. There should be an undo toast or confirmation dialog before deletion.", sentiment: "Negative", priority: "P2", category: "UI/UX", rating: 3, daysAgo: 14 },
  { text: "Password reset emails take up to 20 minutes to arrive in Outlook inboxes.", sentiment: "Negative", priority: "P2", category: "Bug Report", rating: 2, daysAgo: 15 },
  { text: "The pricing structure is very transparent and much more affordable than legacy enterprise suites.", sentiment: "Positive", priority: "P3", category: "Pricing", rating: 5, daysAgo: 16 },
  { text: "API response latencies spike significantly between 2 PM and 5 PM UTC on weekdays.", sentiment: "Negative", priority: "P1", category: "Performance", rating: 2, daysAgo: 17 },
  { text: "Everything runs smoothly for our 20-person support team. Great product!", sentiment: "Positive", priority: "P3", category: "Customer Support", rating: 5, daysAgo: 18 },
  { text: "The attention panel highlighted customer churn risks before they escalated. Great AI summary feature.", sentiment: "Positive", priority: "P3", category: "Feature Request", rating: 5, daysAgo: 19 },
  { text: "Export button gives an empty file when filtering for date ranges longer than 60 days.", sentiment: "Negative", priority: "P1", category: "Bug Report", rating: 2, daysAgo: 20 },
  { text: "Could you support multiple workspaces under a single company billing account?", sentiment: "Neutral", priority: "P2", category: "Feature Request", rating: 4, daysAgo: 22 },
  { text: "Support response took 3 days for our ticket #4192. Urgent tickets shouldn't wait this long.", sentiment: "Negative", priority: "P1", category: "Customer Support", rating: 1, daysAgo: 24 },
  { text: "Cleanest feedback aggregation tool we have tried so far. Very responsive UI.", sentiment: "Positive", priority: "P3", category: "UI/UX", rating: 5, daysAgo: 26 },
  { text: "Page load on the insights tab is a bit sluggish when loading 90-day sentiment trends.", sentiment: "Neutral", priority: "P2", category: "Performance", rating: 3, daysAgo: 28 },
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

  // 4. Seed realistic feedbacks
  for (const item of SAMPLE_FEEDBACKS) {
    const rawAi = {
      summary: item.text.length > 80 ? item.text.substring(0, 77) + '...' : item.text,
      sentiment: item.sentiment,
      urgency: item.priority === 'P0' ? 'immediate' : item.priority === 'P1' ? 'high' : 'normal',
      severity: item.priority === 'P0' ? 'critical' : item.priority === 'P1' ? 'high' : item.priority === 'P2' ? 'medium' : 'low',
      intent: item.category === 'Bug Report' ? 'complaint' : item.category === 'Feature Request' ? 'request' : 'feedback',
      root_cause: item.category === 'Bug Report' ? 'Service instability or unhandled client exception' : null,
      action_items: item.priority === 'P0' || item.priority === 'P1'
        ? ['Investigate exception logs in monitoring', 'Escalate to on-call engineering team', 'Notify impacted customer']
        : ['Review feedback in weekly product triage', 'Monitor recurrence in sentiment trends'],
      aspects: [
        { category: item.category, sentiment: item.sentiment.toLowerCase(), observation: item.text.substring(0, 60) },
      ],
    };

    await pool.query(
      `INSERT INTO feedbacks (
        product_id, feedback, email, rating, status, processing_status,
        categories, category_name, sentiment_label, priority_label,
        confidence, raw_ai_metadata, created_at, analyzed_at
      ) VALUES (
        $1, $2, $3, $4, 'processed', 'analyzed',
        $5::text[], $6, $7, $8,
        'high', $9::jsonb, now() - ($10 || ' days')::interval, now() - ($10 || ' days')::interval
      )`,
      [
        demoProductId,
        item.text,
        `customer_${Math.floor(Math.random() * 900 + 100)}@example.com`,
        item.rating,
        [item.category],
        item.category,
        item.sentiment,
        item.priority,
        JSON.stringify(rawAi),
        String(item.daysAgo),
      ]
    );
  }

  logger.info('Demo Workspace successfully initialized with sample data.');
  return demoUser;
}

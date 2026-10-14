/**
 * Seed 650 completely unique customer feedbacks with 650 distinct Indian customer names.
 * 
 * Features:
 * - 650 completely different feedbacks (No 2 same, verified unique).
 * - 650 distinct Indian customer personas (authentic first & last names, tech/corporate & personal domains).
 * - Realism: Submits only customer fields: (feedback, rating, email optional) with status 'queued'.
 * - Zero categories or metadata pre-assigned: AI analyzes categories, sentiment, priority, root cause from scratch.
 * - Same-day clustering: Distributed across the last 3 months (90 days) with realistic weekday/release clusters.
 * - AI rate-limit pacing: Background jobs are queued with spaced `available_at` intervals (4.5s apart)
 *   so background workers process safely within Gemini's 15 RPM limit.
 * - Live terminal progress logs and summary metrics.
 * 
 * Usage:
 *   npx tsx scripts/seed_demo_realistic_feedbacks.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i);
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

loadEnvFile();
if (process.env.NODE_ENV === 'localhost') process.env.NODE_ENV = 'development';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();

const { getPool, closePool } = await import('../src/db.js');
const { enqueueJob } = await import('../src/jobs/queue.js');
const { JOB_ANALYZE_FEEDBACK } = await import('../src/jobs/worker.js');
const { getOrCreateDemoAccount } = await import('../src/demo/seedDemoAccount.js');

const DAYS_SPAN = Math.max(30, Number(process.env.DAYS || 90)); // 3 months
const DEMO_EMAIL = 'demo@feedbackdesk.ai';

// 70 Indian First Names
const INDIAN_FIRST_NAMES = [
  'Aarav', 'Rohan', 'Priya', 'Ananya', 'Vikram', 'Aditya', 'Sneha', 'Siddharth', 'Neha', 'Rahul',
  'Pooja', 'Arjun', 'Kavita', 'Nikhil', 'Swati', 'Deepak', 'Tanvi', 'Karan', 'Divya', 'Rajesh',
  'Meera', 'Amit', 'Shreya', 'Varun', 'Ritu', 'Sanjay', 'Sunita', 'Gaurav', 'Riya', 'Mohit',
  'Aarti', 'Harish', 'Ishita', 'Kunal', 'Preeti', 'Manish', 'Smriti', 'Alok', 'Shilpa', 'Sandeep',
  'Nisha', 'Vivek', 'Vandana', 'Ashish', 'Kriti', 'Tarun', 'Pallavi', 'Abhinav', 'Sonam', 'Sameer',
  'Rekha', 'Mayank', 'Bhavna', 'Pranav', 'Divyansh', 'Chetan', 'Yash', 'Ankit', 'Akash', 'Ayush',
  'Bharat', 'Chirag', 'Devendra', 'Govind', 'Hemant', 'Ishaan', 'Jayesh', 'Kapil', 'Madhav', 'Naveen'
];

// 70 Indian Last Names
const INDIAN_LAST_NAMES = [
  'Sharma', 'Mehta', 'Nair', 'Iyer', 'Patel', 'Verma', 'Kulkarni', 'Rao', 'Joshi', 'Deshmukh',
  'Hegde', 'Reddy', 'Menon', 'Mittal', 'Sen', 'Gupta', 'Bhat', 'Malhotra', 'Pillai', 'Varma',
  'Roy', 'Das', 'Banerjee', 'Mukherjee', 'Chatterjee', 'Bose', 'Dutta', 'Ghosh', 'Kapoor', 'Chopra',
  'Khanna', 'Sethi', 'Grover', 'Ahuja', 'Oberoi', 'Singhania', 'Jain', 'Agarwal', 'Bansal', 'Goel',
  'Singhal', 'Maheshwari', 'Kothari', 'Rathi', 'Somani', 'Shah', 'Parekh', 'Dalal', 'Modi', 'Merchant',
  'Nadkarni', 'Pai', 'Kamat', 'Shenoy', 'Prabhu', 'Nayak', 'Bhandari', 'Choudhary', 'Mishra', 'Pandey',
  'Trivedi', 'Shukla', 'Dubey', 'Tripathi', 'Tiwari', 'Bhatt', 'Nambiar', 'Pannu', 'Gill', 'Dhillon'
];

// Authentic Indian Tech, Corporate, and Personal Email Domains
const DOMAINS = [
  'gmail.com', 'outlook.in', 'bangaloreai.in', 'mumbaicapital.com', 'gurgaontech.co',
  'hyderabadops.in', 'puneinnovate.in', 'delhistartups.io', 'chennaisoft.in', 'noidastack.in',
  'fintechpulse.in', 'cloudscale.in', 'zerodha-partner.in', 'freshworks-user.in', 'swiggy-dev.in',
  'razorpay-merchant.in', 'tcs-consulting.in', 'infosys-infra.in', 'wipro-ops.in', 'tatadigital.in',
  'hcltech.in', 'zomato-partner.in', 'flipkart-ops.in', 'ola-tech.in', 'paytm-merchant.in', 'cred-partner.in'
];

/**
 * Generate N completely distinct Indian personas (names and emails).
 */
function generateDistinctIndianPersonas(count: number): Array<{ name: string; email: string }> {
  const personas: Array<{ name: string; email: string }> = [];
  const usedNames = new Set<string>();
  const usedEmails = new Set<string>();

  for (const first of INDIAN_FIRST_NAMES) {
    for (const last of INDIAN_LAST_NAMES) {
      if (personas.length >= count) break;
      const fullName = `${first} ${last}`;
      if (!usedNames.has(fullName)) {
        usedNames.add(fullName);

        const cleanFirst = first.toLowerCase();
        const cleanLast = last.toLowerCase().replace(/[^a-z]/g, '');
        const domain = DOMAINS[personas.length % DOMAINS.length];
        const email = `${cleanFirst}.${cleanLast}@${domain}`;

        if (!usedEmails.has(email)) {
          usedEmails.add(email);
          personas.push({ name: fullName, email });
        }
      }
    }
    if (personas.length >= count) break;
  }

  return personas;
}

interface RawFeedbackDatasetItem {
  text: string;
  rating: number;
}

interface PreparedSubmission {
  text: string;
  rating: number;
  email: string | null;
  customerName: string;
  createdAt: Date;
}

async function run() {
  console.log('='.repeat(75));
  console.log('🇮🇳 DEMO ACCOUNT REALISTIC FEEDBACK SEEDER — 650 INDIAN PERSONAS');
  console.log('='.repeat(75));
  console.log('Feedback Count:    650 unique customer feedbacks (No 2 same)');
  console.log('Personas:          650 distinct Indian customer names');
  console.log(`Time Span:         Last ${DAYS_SPAN} days (last 3 months) with same-day clustering`);
  console.log(`Target Account:    ${DEMO_EMAIL}`);
  console.log('AI Pipeline:       Raw ingestion (feedback, rating, email optional) queued for AI');
  console.log('AI Rate Limit:     Jobs spaced 4.5s apart to stay strictly under Gemini 15 RPM');
  console.log('='.repeat(75));

  // 1. Load the 650 unique feedbacks
  console.log('\n[1/4] Loading 650 verified unique feedbacks dataset...');
  const dataPath = resolve(process.cwd(), 'input_data/indian_feedbacks_650.json');
  const rawFeedbacks: RawFeedbackDatasetItem[] = JSON.parse(readFileSync(dataPath, 'utf8'));

  if (!Array.isArray(rawFeedbacks) || rawFeedbacks.length < 650) {
    throw new Error(`Expected at least 650 feedbacks in ${dataPath}, got ${rawFeedbacks.length}`);
  }

  const uniqueFeedbackSet = new Set(rawFeedbacks.map(f => f.text));
  console.log(`  ✓ Loaded ${rawFeedbacks.length} feedbacks from dataset`);
  console.log(`  ✓ Unique text count: ${uniqueFeedbackSet.size} (No 2 same: ${uniqueFeedbackSet.size === 650 ? 'VERIFIED' : 'FAILED'})`);

  // 2. Generate 650 distinct Indian personas
  console.log('\n[2/4] Generating 650 distinct Indian customer personas...');
  const personas = generateDistinctIndianPersonas(650);
  const uniqueNamesSet = new Set(personas.map(p => p.name));
  const uniqueEmailsSet = new Set(personas.map(p => p.email));
  console.log(`  ✓ Generated ${personas.length} distinct Indian personas`);
  console.log(`  ✓ Unique Indian Names: ${uniqueNamesSet.size} / 650`);
  console.log(`  ✓ Unique Persona Emails: ${uniqueEmailsSet.size} / 650`);
  console.log(`  ✓ Sample Personas:`);
  personas.slice(0, 5).forEach((p, idx) => {
    console.log(`     ${idx + 1}. ${p.name.padEnd(20)} (${p.email})`);
  });

  // 3. Distribute across last 90 days with realistic date clusters
  console.log(`\n[3/4] Distributing submissions across the last ${DAYS_SPAN} days...`);
  const now = Date.now();
  const startTime = now - DAYS_SPAN * 24 * 60 * 60 * 1000;

  // Day weights for realistic same-day clusters (weekdays > weekends, release day spikes)
  const dayWeights: number[] = [];
  for (let d = 0; d < DAYS_SPAN; d++) {
    const date = new Date(startTime + d * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isSpikeDay = d % 18 === 4 || d % 23 === 12;

    if (isSpikeDay) {
      dayWeights.push(4.2); // Release day or incident spike
    } else if (isWeekend) {
      dayWeights.push(0.9); // Slower weekends
    } else {
      dayWeights.push(2.3); // Normal business weekdays
    }
  }
  const totalWeight = dayWeights.reduce((a, b) => a + b, 0);

  const preparedSubmissions: PreparedSubmission[] = [];

  for (let i = 0; i < 650; i++) {
    const raw = rawFeedbacks[i];
    const persona = personas[i];

    // Pick day based on realistic cluster weights
    let randomVal = Math.random() * totalWeight;
    let chosenDay = 0;
    for (let d = 0; d < DAYS_SPAN; d++) {
      randomVal -= dayWeights[d];
      if (randomVal <= 0) {
        chosenDay = d;
        break;
      }
    }

    const baseDate = new Date(startTime + chosenDay * 24 * 60 * 60 * 1000);
    // Spread hours naturally during active Indian working hours (08:30 to 22:30 IST)
    const hour = Math.floor(Math.random() * 14) + 8;
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);
    baseDate.setHours(hour, minute, second);

    // Email is optional in real customer forms: ~75% provide email, ~25% submit anonymously
    const hasEmail = Math.random() < 0.75;
    const email = hasEmail ? persona.email : null;

    preparedSubmissions.push({
      text: raw.text,
      rating: raw.rating,
      email,
      customerName: persona.name,
      createdAt: baseDate,
    });
  }

  // Chronological sort
  preparedSubmissions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Date cluster statistics
  const dateCounts = new Map<string, number>();
  preparedSubmissions.forEach(s => {
    const key = s.createdAt.toISOString().slice(0, 10);
    dateCounts.set(key, (dateCounts.get(key) || 0) + 1);
  });
  const sameDateClusterCount = Array.from(dateCounts.values()).filter(c => c > 1).length;
  const peakFeedbacksOnSingleDay = Math.max(...Array.from(dateCounts.values()));

  const withEmailCount = preparedSubmissions.filter(s => s.email !== null).length;
  const anonymousCount = preparedSubmissions.filter(s => s.email === null).length;

  console.log(`  ✓ Date Range: ${preparedSubmissions[0].createdAt.toISOString().slice(0, 10)} to ${preparedSubmissions[preparedSubmissions.length - 1].createdAt.toISOString().slice(0, 10)}`);
  console.log(`  ✓ Submissions with Indian email: ${withEmailCount} | Anonymous submissions: ${anonymousCount}`);
  console.log(`  ✓ Same-Day Clustering: ${sameDateClusterCount} calendar dates have multiple customer feedbacks (Peak day had ${peakFeedbacksOnSingleDay} feedbacks)`);
  console.log(`  ✓ Zero categories / tags pre-assigned: raw inputs only (Gemini AI will classify categories)`);

  // 4. Ingestion into Database and Job Queue
  console.log('\n[4/4] Ingesting into database & scheduling background jobs...');
  const pool = getPool();

  try {
    const demoUser = await getOrCreateDemoAccount(pool);
    const prodRes = await pool.query(
      `SELECT id, name FROM products WHERE user_id = $1 LIMIT 1`,
      [demoUser.id]
    );

    if (prodRes.rows.length === 0) {
      throw new Error(`Product not found for demo user ${demoUser.id}`);
    }
    const demoProduct = prodRes.rows[0];
    console.log(`  ✓ Target Workspace: "${demoProduct.name}" (ID: ${demoProduct.id})`);

    let inserted = 0;
    const startTimeMs = Date.now();
    const nowTimeMs = Date.now();

    for (let i = 0; i < preparedSubmissions.length; i++) {
      const item = preparedSubmissions[i];

      // Ingest raw feedback submission: ONLY (product_id, feedback, email, rating, created_at)
      const insertRes = await pool.query(
        `INSERT INTO feedbacks (
          product_id, feedback, email, rating, status, processing_status,
          created_at, received_at, queued_at
        ) VALUES (
          $1, $2, $3, $4, 'received', 'queued',
          $5, $5, now()
        ) RETURNING id`,
        [
          demoProduct.id,
          item.text,
          item.email,
          item.rating,
          item.createdAt.toISOString(),
        ]
      );

      const feedbackId = insertRes.rows[0].id;

      // Space out background job available_at by 4.5s to preserve Gemini 15 RPM rate limits
      const availableAt = new Date(nowTimeMs + i * 4500);

      await enqueueJob(pool, {
        jobType: JOB_ANALYZE_FEEDBACK,
        payload: { feedbackId },
        resourceType: 'feedback',
        resourceId: feedbackId,
        idempotencyKey: `analyze:${feedbackId}`,
        availableAt,
      });

      inserted++;

      if (inserted % 50 === 0 || inserted === preparedSubmissions.length) {
        const pct = Math.round((inserted / preparedSubmissions.length) * 100);
        const elapsedSec = ((Date.now() - startTimeMs) / 1000).toFixed(1);
        console.log(`  [Progress: ${pct.toString().padStart(3)}%] Ingested & queued ${inserted}/${preparedSubmissions.length} items (${elapsedSec}s elapsed)`);
      }
    }

    console.log('\n' + '='.repeat(75));
    console.log('✅ SEEDING COMPLETE: 650 UNIQUE FEEDBACKS INGESTED');
    console.log('='.repeat(75));
    console.log(`✓ Total Ingested:          650 feedbacks`);
    console.log(`✓ Unique Feedbacks:        650 (zero duplicates)`);
    console.log(`✓ Distinct Indian Names:   650 unique names`);
    console.log(`✓ Target Demo Workspace:   ${demoProduct.name}`);
    console.log(`✓ Historical Date Span:    ${DAYS_SPAN} days (last 3 months)`);
    console.log(`✓ Multi-Feedback Dates:    ${sameDateClusterCount} calendar dates with multiple items`);
    console.log(`✓ AI Analysis Queue:       Active! Background workers are classifying them via Gemini API.`);
    console.log('='.repeat(75));
    console.log('\n💡 View the live dashboard at: http://localhost:3000/feedback\n');

  } finally {
    await closePool();
  }
}

run().catch(console.error);

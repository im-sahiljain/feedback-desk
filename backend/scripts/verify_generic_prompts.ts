/**
 * One-off verification for generic classify prompts. Not used in production.
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
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile();
if (process.env.NODE_ENV === 'localhost') process.env.NODE_ENV = 'development';

const { resetConfigCache, loadConfig } = await import('../src/config/env.js');
resetConfigCache();
loadConfig();
const { classifyImpactSingle } = await import('../src/ai/classify.js');

const MASH =
  'Bbbbbbdjejdbdjdjdbjdjdbdbdjdnnhhhbbbhhhhbbbnjrnndnsnwnnxnxndnejjdncndndndndncnnsnwjsnfbejsjwjdhwhfuwbdjebfosnehudjwyf8wbwidhwdidbdvriwudbwdihdveidbeudbdhjdbdhdjdjdhdjdjfjfjfbsnkwocjdbdhejbfbfjskqichevdsidbriebdjsbwhcusbdbdiwbdhdiwbixbwudnvdisjdjwixwhidhwjsixbwjbwggsuqbfhhehsguqhdjehdidbdiwisjxhdjjsjdjdjdjxjdjdjdjdndnsbdbbfbdjdnndbdbdbxhxbdbdbdbhwhsbdbbdbdhdbdbdhd';

const cases = [
  {
    id: 'mash',
    text: MASH,
    labels: [
      'Bug Report',
      'Performance Issue',
      'UI/UX',
      'Feature Request',
      'Customer Support',
      'Security',
    ],
  },
  {
    id: 'rs',
    text: 'Give me Rs 100000',
    labels: ['Bug Report', 'Payment', 'Customer Support', 'Feature Request'],
  },
  {
    id: 'checkout',
    text: 'Checkout failed twice with a card declined error even though my card works elsewhere. Order never completed.',
    labels: ['Bug Report', 'Payment', 'Performance Issue', 'UI/UX'],
  },
  {
    id: 'mixed',
    text: 'The app is fast and easy to use, but payments fail and support has not replied for three days. I wish I could export reports to Excel.',
    labels: ['Bug Report', 'Payment', 'Customer Support', 'Feature Request', 'UI/UX'],
  },
];

for (const c of cases) {
  const r = await classifyImpactSingle(c.text, c.labels);
  console.log(
    JSON.stringify(
      {
        id: c.id,
        category: r.category.label,
        categories: r.categories,
        sentiment: r.sentiment.label,
        priority: r.priority.label,
        severity: r.severity,
        urgency: r.urgency,
        intents: r.intents,
        topics: r.topics,
        issues: r.issues,
        requestedCapabilities: r.requestedCapabilities,
        positiveAttributes: r.positiveAttributes,
        summary: r.summary,
        aspects: r.aspects?.length ?? 0,
        root_cause: r.root_cause || null,
        action_items: r.action_items,
        hypotheses: (r.rootCauseHypotheses || []).length,
        model: r.model_name,
        prompt_version: r.prompt_version,
        schema_version: r.schema_version,
      },
      null,
      2
    )
  );
}

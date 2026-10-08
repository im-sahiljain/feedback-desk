import type { Pool } from 'pg';
import { parsePeriodBounds } from '../executive_brief.js';
import { formatFriendlyDate } from '../dates.js';

export type DashboardPeriod = '7d' | '30d' | '90d';

export interface ChangeDelta {
  absolute: number;
  percent: number | null;
  display: string;
  direction: 'up' | 'down' | 'flat' | 'new';
  meaningful: boolean;
  smallSample: boolean;
}

export interface DashboardPeriodInfo {
  key: DashboardPeriod;
  label: string;
  from: string;
  to: string;
  comparisonFrom: string;
  comparisonTo: string;
  comparisonLabel: string;
}

export interface DashboardSummaryPayload {
  period: DashboardPeriodInfo;
  summary: {
    feedbackCount: number;
    feedbackCountChange: ChangeDelta;
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
      mixed: number;
      analyzed: number;
      positivePct: number | null;
      negativePct: number | null;
      mixedPct: number | null;
      neutralPct: number | null;
      direction: 'improving' | 'worsening' | 'stable' | 'insufficient';
    };
    negativeChange: ChangeDelta;
    needsAttention: {
      total: number;
      highPriority: number;
      failedOrNeedsReview: number;
    };
    processing: {
      received: number;
      analyzed: number;
      processing: number;
      failed: number;
      pending: number;
    };
  };
  attention: Array<{
    category: string;
    feedbackCount: number;
    negativeCount: number;
    highPriorityCount: number;
    change: ChangeDelta;
    severity: 'high' | 'medium' | 'watch';
    signal: string | null;
    evidenceFeedbackId: string | null;
    evidenceDateKey: string | null;
  }>;
  changes: Array<{
    id: string;
    direction: 'up' | 'down';
    label: string;
    detail: string;
    category?: string;
    change: ChangeDelta;
  }>;
  topAreas: Array<{
    category: string;
    feedbackCount: number;
    negativeCount: number;
    highPriorityCount: number;
    positiveCount: number;
    change: ChangeDelta;
    signal: 'worsening' | 'improving' | 'stable' | 'watch' | 'high_priority';
  }>;
  positiveSignals: Array<{
    category: string;
    positiveCount: number;
    change: ChangeDelta;
  }>;
  sentimentTrend: Array<{
    bucket: string;
    label: string;
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
    total: number;
  }>;
  criticalFeedback: Array<{
    id: string;
    text: string;
    sentiment: string | null;
    priority: string | null;
    category: string | null;
    createdAt: string;
    processingStatus: string | null;
    summary: string | null;
  }>;
  brief: {
    available: boolean;
    headline: string | null;
    whatIsHappening: string | null;
    whyItMatters: string | null;
    recommendedFocus: string | null;
    healthStatus: string | null;
    generatedAt: string | null;
    supportingCategory: string | null;
  } | null;
}

const PERIOD_MS: Record<DashboardPeriod, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

const MIN_SAMPLE_FOR_PCT = 3;
const CHANGE_ABS_THRESHOLD = 2;
const CHANGE_PCT_THRESHOLD = 15;

export function isDashboardPeriod(value: string): value is DashboardPeriod {
  return value === '7d' || value === '30d' || value === '90d';
}

export function computeChangeDelta(
  current: number,
  previous: number,
  options: { absThreshold?: number; pctThreshold?: number } = {}
): ChangeDelta {
  const absThreshold = options.absThreshold ?? CHANGE_ABS_THRESHOLD;
  const pctThreshold = options.pctThreshold ?? CHANGE_PCT_THRESHOLD;
  const absolute = current - previous;
  const smallSample = previous > 0 && previous < MIN_SAMPLE_FOR_PCT;

  if (previous === 0) {
    if (current === 0) {
      return {
        absolute: 0,
        percent: 0,
        display: 'No change',
        direction: 'flat',
        meaningful: false,
        smallSample: false,
      };
    }
    return {
      absolute: current,
      percent: null,
      display: `${current} new`,
      direction: 'new',
      meaningful: current >= absThreshold,
      smallSample: false,
    };
  }

  const percent = Math.round(((current - previous) / previous) * 1000) / 10;
  const direction: ChangeDelta['direction'] =
    absolute > 0 ? 'up' : absolute < 0 ? 'down' : 'flat';

  let display: string;
  if (direction === 'flat') {
    display = 'No change';
  } else if (smallSample && Math.abs(percent) >= 100) {
    display = `${previous} → ${current}`;
  } else {
    const arrow = direction === 'up' ? '↑' : '↓';
    display = `${arrow} ${Math.abs(percent)}%`;
  }

  const meaningful =
    !smallSample &&
    Math.abs(absolute) >= absThreshold &&
    Math.abs(percent) >= pctThreshold;

  return {
    absolute,
    percent,
    display,
    direction,
    meaningful,
    smallSample,
  };
}

function pctOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function sentimentDirection(
  currentNegPct: number | null,
  previousNegPct: number | null,
  currentPosPct: number | null,
  previousPosPct: number | null,
  analyzed: number
): 'improving' | 'worsening' | 'stable' | 'insufficient' {
  if (analyzed < MIN_SAMPLE_FOR_PCT) return 'insufficient';
  if (currentNegPct == null || previousNegPct == null) return 'insufficient';

  const negDelta = currentNegPct - previousNegPct;
  const posDelta =
    currentPosPct != null && previousPosPct != null
      ? currentPosPct - previousPosPct
      : 0;

  if (negDelta <= -3 || posDelta >= 3) return 'improving';
  if (negDelta >= 3 || posDelta <= -3) return 'worsening';
  return 'stable';
}

function severityForArea(
  negativeCount: number,
  highPriorityCount: number,
  change: ChangeDelta
): 'high' | 'medium' | 'watch' {
  if (highPriorityCount >= 3 || (negativeCount >= 10 && change.direction === 'up' && change.meaningful)) {
    return 'high';
  }
  if (highPriorityCount >= 1 || negativeCount >= 5 || change.meaningful) {
    return 'medium';
  }
  return 'watch';
}

function signalForArea(
  change: ChangeDelta,
  highPriorityCount: number,
  negativeCount: number,
  positiveCount: number
): 'worsening' | 'improving' | 'stable' | 'watch' | 'high_priority' {
  if (highPriorityCount >= 3 && negativeCount >= positiveCount) return 'high_priority';
  if (change.direction === 'up' && change.meaningful && negativeCount > 0) return 'worsening';
  if (change.direction === 'down' && change.meaningful) return 'improving';
  if (highPriorityCount > 0) return 'watch';
  return 'stable';
}

function periodLabelShort(period: DashboardPeriod): string {
  switch (period) {
    case '7d':
      return 'Last 7 days';
    case '30d':
      return 'Last 30 days';
    case '90d':
      return 'Last 90 days';
  }
}

function comparisonPeriodLabel(period: DashboardPeriod): string {
  switch (period) {
    case '7d':
      return 'previous 7 days';
    case '30d':
      return 'previous 30 days';
    case '90d':
      return 'previous 90 days';
  }
}

export function resolveDashboardWindows(period: DashboardPeriod, now = new Date()) {
  const { startDate, endDate, periodKey, periodLabel } = parsePeriodBounds(period);
  const from = startDate ?? new Date(now.getTime() - PERIOD_MS[period]);
  const to = endDate ?? now;
  const durationMs = to.getTime() - from.getTime();
  const comparisonTo = new Date(from.getTime());
  const comparisonFrom = new Date(from.getTime() - durationMs);

  return {
    periodKey: periodKey as DashboardPeriod,
    periodLabel,
    from,
    to,
    comparisonFrom,
    comparisonTo,
  };
}

type CountRow = {
  total: string;
  positive: string;
  neutral: string;
  negative: string;
  mixed: string;
  high_priority: string;
  analyzed: string;
  processing: string;
  failed: string;
  pending: string;
};

type CategoryRow = {
  category: string;
  total_count: string;
  negative_count: string;
  positive_count: string;
  high_priority_count: string;
};

async function queryPeriodCounts(
  pool: Pool,
  productId: string,
  from: Date,
  to: Date,
  options: { endInclusive?: boolean } = {}
): Promise<CountRow> {
  const endInclusive = options.endInclusive === true;
  const res = await pool.query(
    `
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'positive')::text AS positive,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'neutral')::text AS neutral,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'negative')::text AS negative,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'mixed')::text AS mixed,
      COUNT(*) FILTER (WHERE (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%'))::text AS high_priority,
      COUNT(*) FILTER (
        WHERE processing_status = 'analyzed'
           OR (sentiment_label IS NOT NULL AND processing_status IS DISTINCT FROM 'failed')
      )::text AS analyzed,
      COUNT(*) FILTER (WHERE processing_status IN ('queued', 'analyzing'))::text AS processing,
      COUNT(*) FILTER (WHERE processing_status = 'failed')::text AS failed,
      COUNT(*) FILTER (
        WHERE processing_status IN ('queued', 'analyzing', 'received')
          AND sentiment_label IS NULL
      )::text AS pending
    FROM feedbacks
    WHERE product_id = $1
      AND deleted_at IS NULL
      AND created_at >= $2::timestamptz
      AND (
        ($4::boolean = true AND created_at <= $3::timestamptz)
        OR ($4::boolean = false AND created_at < $3::timestamptz)
      )
    `,
    [productId, from, to, endInclusive]
  );
  return res.rows[0] as CountRow;
}

async function queryCategoryStats(
  pool: Pool,
  productId: string,
  from: Date,
  to: Date,
  options: { endInclusive?: boolean } = {}
): Promise<CategoryRow[]> {
  const endInclusive = options.endInclusive === true;
  const res = await pool.query(
    `
    SELECT
      cat AS category,
      COUNT(*)::text AS total_count,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'negative')::text AS negative_count,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'positive')::text AS positive_count,
      COUNT(*) FILTER (WHERE (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%'))::text AS high_priority_count
    FROM (
      SELECT
        unnest(COALESCE(categories, ARRAY[COALESCE(category_name, 'General')])) AS cat,
        sentiment_label,
        priority_label
      FROM feedbacks
      WHERE product_id = $1
        AND deleted_at IS NULL
        AND created_at >= $2::timestamptz
        AND (
          ($4::boolean = true AND created_at <= $3::timestamptz)
          OR ($4::boolean = false AND created_at < $3::timestamptz)
        )
    ) sub
    WHERE cat IS NOT NULL AND btrim(cat) <> ''
    GROUP BY cat
    ORDER BY
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'negative') DESC,
      COUNT(*) FILTER (WHERE (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%')) DESC,
      COUNT(*) DESC
    LIMIT 12
    `,
    [productId, from, to, endInclusive]
  );
  return res.rows as CategoryRow[];
}

async function queryCategorySignals(
  pool: Pool,
  productId: string,
  from: Date,
  to: Date,
  categories: string[]
): Promise<
  Map<
    string,
    { signal: string | null; feedbackId: string; dateKey: string }
  >
> {
  const map = new Map<
    string,
    { signal: string | null; feedbackId: string; dateKey: string }
  >();
  if (categories.length === 0) return map;

  const res = await pool.query(
    `
    SELECT category, signal, feedback_id, date_key
    FROM (
      SELECT
        cat AS category,
        COALESCE(
          NULLIF(btrim(raw_ai_metadata->>'root_cause'), ''),
          NULLIF(btrim(raw_ai_metadata->>'summary'), '')
        ) AS signal,
        id AS feedback_id,
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date_key,
        ROW_NUMBER() OVER (
          PARTITION BY cat
          ORDER BY
            CASE WHEN (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%') THEN 0 ELSE 1 END,
            created_at DESC
        ) AS rn
      FROM (
        SELECT
          id,
          unnest(COALESCE(categories, ARRAY[COALESCE(category_name, 'General')])) AS cat,
          raw_ai_metadata,
          priority_label,
          created_at,
          sentiment_label
        FROM feedbacks
        WHERE product_id = $1
          AND deleted_at IS NULL
          AND created_at >= $2::timestamptz
          AND created_at <= $3::timestamptz
          AND (
            sentiment_label ILIKE 'negative'
            OR (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%')
          )
      ) base
      WHERE cat = ANY($4::text[])
    ) ranked
    WHERE rn = 1
    `,
    [productId, from, to, categories]
  );

  for (const row of res.rows) {
    if (row.category && row.feedback_id) {
      map.set(row.category, {
        signal: row.signal || null,
        feedbackId: row.feedback_id,
        dateKey: row.date_key,
      });
    }
  }
  return map;
}

async function querySentimentTrend(
  pool: Pool,
  productId: string,
  from: Date,
  to: Date,
  period: DashboardPeriod
): Promise<DashboardSummaryPayload['sentimentTrend']> {
  const trunc = period === '90d' ? 'week' : 'day';
  const res = await pool.query(
    `
    SELECT
      date_trunc($4, created_at) AS bucket,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'positive')::int AS positive,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'neutral')::int AS neutral,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'negative')::int AS negative,
      COUNT(*) FILTER (WHERE sentiment_label ILIKE 'mixed')::int AS mixed,
      COUNT(*)::int AS total
    FROM feedbacks
    WHERE product_id = $1
      AND deleted_at IS NULL
      AND created_at >= $2::timestamptz
      AND created_at <= $3::timestamptz
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    [productId, from, to, trunc]
  );

  return res.rows.map((row) => {
    const bucketDate = new Date(row.bucket);
    const label =
      trunc === 'week'
        ? `Week of ${formatFriendlyDate(bucketDate)}`
        : bucketDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      bucket: bucketDate.toISOString(),
      label,
      positive: Number(row.positive) || 0,
      neutral: Number(row.neutral) || 0,
      negative: Number(row.negative) || 0,
      mixed: Number(row.mixed) || 0,
      total: Number(row.total) || 0,
    };
  });
}

async function queryCriticalFeedback(
  pool: Pool,
  productId: string,
  from: Date,
  to: Date
): Promise<DashboardSummaryPayload['criticalFeedback']> {
  const res = await pool.query(
    `
    SELECT
      id,
      feedback,
      sentiment_label,
      priority_label,
      COALESCE(
        NULLIF(categories[1], ''),
        category_name,
        'General'
      ) AS category,
      created_at,
      processing_status,
      COALESCE(
        NULLIF(btrim(raw_ai_metadata->>'summary'), ''),
        NULLIF(btrim(raw_ai_metadata->>'root_cause'), '')
      ) AS summary
    FROM feedbacks
    WHERE product_id = $1
      AND deleted_at IS NULL
      AND created_at >= $2::timestamptz
      AND created_at <= $3::timestamptz
      AND (
        (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%')
        OR processing_status = 'failed'
        OR (sentiment_label ILIKE 'negative' AND priority_label ILIKE '%medium%')
      )
    ORDER BY
      CASE
        WHEN (priority_label ILIKE '%high%' OR priority_label ILIKE '%critical%') THEN 0
        WHEN processing_status = 'failed' THEN 1
        ELSE 2
      END,
      created_at DESC
    LIMIT 5
    `,
    [productId, from, to]
  );

  return res.rows.map((row) => ({
    id: row.id,
    text: typeof row.feedback === 'string' ? row.feedback.slice(0, 220) : '',
    sentiment: row.sentiment_label || null,
    priority: row.priority_label || null,
    category: row.category || null,
    createdAt: new Date(row.created_at).toISOString(),
    processingStatus: row.processing_status || null,
    summary: row.summary || null,
  }));
}

async function queryCachedBrief(
  pool: Pool,
  productId: string,
  period: DashboardPeriod
): Promise<DashboardSummaryPayload['brief']> {
  const res = await pool.query(
    `
    SELECT brief, created_at, period_key
    FROM executive_briefs
    WHERE product_id = $1 AND period_key = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [productId, period]
  );

  if (res.rows.length === 0) {
    return {
      available: false,
      headline: null,
      whatIsHappening: null,
      whyItMatters: null,
      recommendedFocus: null,
      healthStatus: null,
      generatedAt: null,
      supportingCategory: null,
    };
  }

  const row = res.rows[0];
  const brief = row.brief || {};
  const decision = Array.isArray(brief.top_strategic_decisions)
    ? brief.top_strategic_decisions[0]
    : null;

  return {
    available: true,
    headline: brief.headline || null,
    whatIsHappening: brief.executive_summary || brief.headline || null,
    whyItMatters:
      brief.impact_correlation?.quantified_impact_statement ||
      brief.impact_correlation?.root_cause_diagnosis ||
      null,
    recommendedFocus: decision?.decision || decision?.title || null,
    healthStatus: brief.macro_health_status || null,
    generatedAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    supportingCategory: brief.impact_correlation?.primary_culprit_category || null,
  };
}

function n(value: string | undefined): number {
  return parseInt(value || '0', 10) || 0;
}

export async function buildDashboardSummary(
  pool: Pool,
  productId: string,
  period: DashboardPeriod
): Promise<DashboardSummaryPayload> {
  const windows = resolveDashboardWindows(period);

  const [
    currentCounts,
    previousCounts,
    currentCategories,
    previousCategories,
    sentimentTrend,
    criticalFeedback,
    brief,
  ] = await Promise.all([
    queryPeriodCounts(pool, productId, windows.from, windows.to, { endInclusive: true }),
    queryPeriodCounts(pool, productId, windows.comparisonFrom, windows.comparisonTo, {
      endInclusive: false,
    }),
    queryCategoryStats(pool, productId, windows.from, windows.to, { endInclusive: true }),
    queryCategoryStats(pool, productId, windows.comparisonFrom, windows.comparisonTo, {
      endInclusive: false,
    }),
    querySentimentTrend(pool, productId, windows.from, windows.to, period),
    queryCriticalFeedback(pool, productId, windows.from, windows.to),
    queryCachedBrief(pool, productId, period),
  ]);

  const prevCatMap = new Map(
    previousCategories.map((c) => [
      c.category,
      {
        total: n(c.total_count),
        negative: n(c.negative_count),
        positive: n(c.positive_count),
        high: n(c.high_priority_count),
      },
    ])
  );

  const feedbackCount = n(currentCounts.total);
  const prevFeedbackCount = n(previousCounts.total);
  const positive = n(currentCounts.positive);
  const neutral = n(currentCounts.neutral);
  const negative = n(currentCounts.negative);
  const mixed = n(currentCounts.mixed);
  const analyzed =
    positive + neutral + negative + mixed > 0
      ? positive + neutral + negative + mixed
      : n(currentCounts.analyzed);
  const prevNegative = n(previousCounts.negative);
  const prevAnalyzed =
    n(previousCounts.positive) +
    n(previousCounts.neutral) +
    n(previousCounts.negative) +
    n(previousCounts.mixed);

  const highPriority = n(currentCounts.high_priority);
  const failed = n(currentCounts.failed);
  const processing = n(currentCounts.processing);
  const pending = n(currentCounts.pending);

  const positivePct = pctOf(positive, analyzed);
  const negativePct = pctOf(negative, analyzed);
  const mixedPct = pctOf(mixed, analyzed);
  const neutralPct = pctOf(neutral, analyzed);
  const prevPositivePct = pctOf(n(previousCounts.positive), prevAnalyzed);
  const prevNegativePct = pctOf(prevNegative, prevAnalyzed);

  const categoryNames = currentCategories.map((c) => c.category);
  const signals = await queryCategorySignals(
    pool,
    productId,
    windows.from,
    windows.to,
    categoryNames.slice(0, 8)
  );

  const areas = currentCategories.map((row) => {
    const category = row.category;
    const feedbackCountCat = n(row.total_count);
    const negativeCount = n(row.negative_count);
    const positiveCount = n(row.positive_count);
    const highPriorityCount = n(row.high_priority_count);
    const prev = prevCatMap.get(category);
    // Compare negative volume for problem ranking; total for general change
    const change = computeChangeDelta(negativeCount, prev?.negative ?? 0);
    return {
      category,
      feedbackCount: feedbackCountCat,
      negativeCount,
      highPriorityCount,
      positiveCount,
      change,
      signal: signalForArea(change, highPriorityCount, negativeCount, positiveCount),
      score:
        negativeCount * 2 +
        highPriorityCount * 3 +
        (change.direction === 'up' && change.meaningful ? 4 : 0) +
        (change.direction === 'new' && negativeCount > 0 ? 3 : 0),
    };
  });

  const attention = areas
    .filter((a) => a.negativeCount > 0 || a.highPriorityCount > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((a) => {
      const evidence = signals.get(a.category);
      return {
        category: a.category,
        feedbackCount: a.feedbackCount,
        negativeCount: a.negativeCount,
        highPriorityCount: a.highPriorityCount,
        change: a.change,
        severity: severityForArea(a.negativeCount, a.highPriorityCount, a.change),
        signal: evidence?.signal || null,
        evidenceFeedbackId: evidence?.feedbackId || null,
        evidenceDateKey: evidence?.dateKey || null,
      };
    });

  const topAreas = [...areas]
    .sort((a, b) => b.feedbackCount - a.feedbackCount)
    .slice(0, 6)
    .map(({ score: _score, ...rest }) => rest);

  const positiveSignals = areas
    .filter((a) => a.positiveCount > 0)
    .map((a) => {
      const prev = prevCatMap.get(a.category);
      const change = computeChangeDelta(a.positiveCount, prev?.positive ?? 0);
      return {
        category: a.category,
        positiveCount: a.positiveCount,
        change,
        rank: a.positiveCount + (change.direction === 'up' && change.meaningful ? 5 : 0),
      };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 4)
    .map(({ rank: _rank, ...rest }) => rest);

  const changes: DashboardSummaryPayload['changes'] = [];

  const feedbackChange = computeChangeDelta(feedbackCount, prevFeedbackCount);
  if (feedbackChange.meaningful || feedbackChange.direction === 'new') {
    changes.push({
      id: 'volume',
      direction: feedbackChange.direction === 'down' ? 'down' : 'up',
      label:
        feedbackChange.direction === 'down'
          ? `Feedback volume decreased ${feedbackChange.display.replace(/^[↑↓]\s*/, '')}`
          : `Feedback volume increased ${feedbackChange.display.replace(/^[↑↓]\s*/, '')}`,
      detail: `${prevFeedbackCount} → ${feedbackCount} vs ${comparisonPeriodLabel(period)}`,
      change: feedbackChange,
    });
  }

  const negativeChange = computeChangeDelta(negative, prevNegative);
  if (negativeChange.meaningful || (negativeChange.direction === 'new' && negative >= 2)) {
    changes.push({
      id: 'negative',
      direction: negativeChange.direction === 'down' ? 'down' : 'up',
      label:
        negativeChange.direction === 'down'
          ? `Negative feedback decreased ${negativeChange.display.replace(/^[↑↓]\s*/, '')}`
          : `Negative feedback increased ${negativeChange.display.replace(/^[↑↓]\s*/, '')}`,
      detail: `${prevNegative} → ${negative} negative items`,
      change: negativeChange,
    });
  }

  for (const area of areas) {
    if (changes.length >= 5) break;
    if (!area.change.meaningful && area.change.direction !== 'new') continue;
    if (area.negativeCount === 0 && area.change.direction !== 'down') continue;

    const prevNeg = prevCatMap.get(area.category)?.negative ?? 0;
    if (area.change.direction === 'up' || area.change.direction === 'new') {
      changes.push({
        id: `cat-neg-${area.category}`,
        direction: 'up',
        label: `${area.category} complaints ${
          area.change.direction === 'new' ? 'appeared' : `increased ${area.change.display.replace(/^[↑↓]\s*/, '')}`
        }`,
        detail: `${prevNeg} → ${area.negativeCount} negative`,
        category: area.category,
        change: area.change,
      });
    } else if (area.change.direction === 'down') {
      changes.push({
        id: `cat-neg-down-${area.category}`,
        direction: 'down',
        label: `${area.category} complaints decreased ${area.change.display.replace(/^[↑↓]\s*/, '')}`,
        detail: `${prevNeg} → ${area.negativeCount} negative`,
        category: area.category,
        change: area.change,
      });
    }
  }

  for (const signal of positiveSignals) {
    if (changes.length >= 5) break;
    if (signal.change.direction !== 'up' || !signal.change.meaningful) continue;
    if (changes.some((c) => c.category === signal.category && c.direction === 'up')) continue;
    changes.push({
      id: `cat-pos-${signal.category}`,
      direction: 'up',
      label: `Positive feedback about ${signal.category} increased ${signal.change.display.replace(/^[↑↓]\s*/, '')}`,
      detail: `${signal.positiveCount} positive mentions`,
      category: signal.category,
      change: signal.change,
    });
  }

  return {
    period: {
      key: period,
      label: periodLabelShort(period),
      from: windows.from.toISOString(),
      to: windows.to.toISOString(),
      comparisonFrom: windows.comparisonFrom.toISOString(),
      comparisonTo: windows.comparisonTo.toISOString(),
      comparisonLabel: `compared with ${comparisonPeriodLabel(period)}`,
    },
    summary: {
      feedbackCount,
      feedbackCountChange: feedbackChange,
      sentiment: {
        positive,
        neutral,
        negative,
        mixed,
        analyzed,
        positivePct,
        negativePct,
        mixedPct,
        neutralPct,
        direction: sentimentDirection(
          negativePct,
          prevNegativePct,
          positivePct,
          prevPositivePct,
          analyzed
        ),
      },
      negativeChange,
      needsAttention: {
        total: highPriority + failed,
        highPriority,
        failedOrNeedsReview: failed,
      },
      processing: {
        received: feedbackCount,
        analyzed: n(currentCounts.analyzed),
        processing,
        failed,
        pending,
      },
    },
    attention,
    changes: changes.slice(0, 5),
    topAreas,
    positiveSignals,
    sentimentTrend,
    criticalFeedback,
    brief,
  };
}

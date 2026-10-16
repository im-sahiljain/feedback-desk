import type { Pool, PoolClient } from "pg";
import { embed, cosine, verifyMatch } from "./ai.js";
import { searchIssueVectors } from "./vectorSearch.js";

/** Conservative, transparent lexical similarity (no external embedding service required).
 * Grouping is category-scoped; the matching score is exposed for future calibration.
 */
const STOP = new Set(
  "a an and are as at be been by can could did do does for from had has have i in is it its me my of on or our please that the their them there these this to us was we were will with you your very really just not".split(
    " ",
  ),
);
export function tokens(text: string): string[] {
  return [
    ...new Set(
      (text.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(
        (w) => !STOP.has(w),
      ),
    ),
  ].slice(0, 80);
}
export function similarity(left: string, right: string): number {
  const a = new Set(tokens(left)),
    b = new Set(tokens(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  return intersection / (a.size + b.size - intersection);
}
function normalizedCategory(v: unknown): string {
  return typeof v === "string" && v.trim()
    ? v.trim().toLowerCase().slice(0, 120)
    : "uncategorized";
}
export type IssueStats = {
  id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  assignee: string | null;
  due_at: string | null;
  resolution_notes: string | null;
  first_seen: string;
  last_seen: string;
  evidence_count: number;
  negative_count: number;
  high_priority_count: number;
  recent_count: number;
  previous_count: number;
  trend: string;
  severity: string;
  evidence_ids: string[];
};

/** Reconcile unlinked feedback only; calls are bounded and idempotent.
 * A database advisory lock prevents competing requests from creating duplicate clusters.
 */
export async function reconcile(
  pool: Pool,
  productId: string,
  limit = 300,
): Promise<{ processed: number; linked: number; remaining: boolean }> {
  // Embeddings are fetched outside the transaction to avoid holding database locks over network calls.
  const pending = await pool.query(
    `SELECT f.id,f.feedback FROM feedbacks f LEFT JOIN intelligence_issue_evidence e ON e.feedback_id=f.id
    WHERE f.product_id=$1 AND f.deleted_at IS NULL AND e.feedback_id IS NULL ORDER BY f.created_at,f.id LIMIT $2`,
    [productId, Math.min(limit, 300)],
  );
  const vectors = new Map<string, number[]>();
  const vectorNeighbors = new Map<
    string,
    Array<{
      id: string;
      title: string;
      category: string;
      embedding: number[];
      similarity: number;
    }>
  >();
  for (const item of pending.rows) {
    if (tokens(String(item.feedback || "")).length < 2) continue;
    try {
      const vector = await embed(String(item.feedback), { productId });
      vectors.set(item.id, vector);
      vectorNeighbors.set(
        item.id,
        await searchIssueVectors(pool, productId, vector, 30),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        /embedding_vector|operator does not exist|relation .* does not exist/i.test(
          error.message,
        )
      )
        throw error;
      /* provider unavailable: lexical fallback */
    }
  }
  // LLM adjudication is limited to a small ambiguous-neighbor band and done before locking.
  const adjudicated = new Map<string, string>();

  let verificationBudget = 8;
  for (const item of pending.rows) {
    if (verificationBudget <= 0) break;
    const vec = vectors.get(item.id);
    if (!vec) continue;
    const neighbors = (vectorNeighbors.get(item.id) || [])
      .map((r) => ({ r, score: Number(r.similarity) }))
      .filter((x) => x.score >= 0.76 && x.score < 0.84)
      .sort((a, b) => b.score - a.score);
    if (neighbors.length) {
      verificationBudget--;
      try {
        if (await verifyMatch(String(item.feedback), neighbors[0].r.title))
          adjudicated.set(item.id, neighbors[0].r.id);
      } catch {
        /* no false-positive merge */
      }
    }
  }
  const client = await pool.connect();
  let processed = 0,
    linked = 0;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `issues:${productId}`,
    ]);
    const feedback = await client.query(
      `SELECT f.id, f.feedback, f.category_name, f.categories, f.created_at
       FROM feedbacks f LEFT JOIN intelligence_issue_evidence ev ON ev.feedback_id = f.id
       WHERE f.product_id = $1 AND f.deleted_at IS NULL AND ev.feedback_id IS NULL
       ORDER BY f.created_at ASC, f.id ASC LIMIT $2`,
      [productId, limit + 1],
    );
    const remaining = feedback.rows.length > limit;
    const candidates = feedback.rows.slice(0, limit);
    const existing = await client.query(
      `SELECT id, title, fingerprint, category, embedding FROM intelligence_issues WHERE product_id=$1 AND merged_into IS NULL`,
      [productId],
    );
    const issues = existing.rows as {
      id: string;
      title: string;
      fingerprint: string;
      category: string;
      embedding: number[] | null;
    }[];
    for (const row of candidates) {
      processed++;
      const text = String(row.feedback || "").trim();
      if (tokens(text).length < 2) continue;
      const category = normalizedCategory(
        row.category_name ||
          (Array.isArray(row.categories) ? row.categories[0] : ""),
      );
      const title = text.slice(0, 160).replace(/\s+/g, " ");
      const nearestIds = new Set(
        (vectorNeighbors.get(row.id) || [])
          .filter((n) => n.category === category)
          .map((n) => n.id),
      );
      const eligible = issues.filter(
        (i) =>
          i.category === category &&
          (!vectors.has(row.id) ||
            nearestIds.has(i.id) ||
            !i.embedding ||
            i.fingerprint === `${category}:${row.id}`),
      );
      let match: (typeof issues)[number] | undefined;
      let best = 0;
      for (const issue of eligible) {
        const vector = vectors.get(row.id);
        const indexed = vectorNeighbors
          .get(row.id)
          ?.find((n) => n.id === issue.id);
        const score =
          vector && indexed
            ? Number(indexed.similarity)
            : vector && Array.isArray(issue.embedding)
              ? cosine(vector, issue.embedding)
              : similarity(title, issue.title);
        if (score > best) {
          best = score;
          match = issue;
        }
      }
      // 0.52 deliberately favors precision over overly broad merging.
      const vector = vectors.get(row.id);
      const verified = issues.find(
        (i) => i.id === adjudicated.get(row.id) && i.category === category,
      );
      if (verified) {
        match = verified;
        best = 1;
      }
      const threshold =
        vector && match && Array.isArray(match.embedding) ? 0.84 : 0.52;
      // Ambiguous semantic candidates require LLM validation, but network I/O never happens inside the transaction.
      if (!match || best < threshold) {
        const fingerprint = `${category}:${row.id}`;
        const inserted = await client.query(
          `INSERT INTO intelligence_issues (product_id,title,category,fingerprint,first_seen,last_seen)
          VALUES ($1,$2,$3,$4,$5,$5) RETURNING id,title,fingerprint,category,embedding`,
          [productId, title, category, fingerprint, row.created_at],
        );
        match = inserted.rows[0];
        issues.push(match!);
        if (vector) {
          await client.query(
            "UPDATE intelligence_issues SET embedding=$2::jsonb WHERE id=$1",
            [match!.id, JSON.stringify(vector)],
          );
          match!.embedding = vector;
        }
      }
      await client.query(
        `INSERT INTO intelligence_issue_evidence (issue_id,feedback_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [match!.id, row.id],
      );
      linked++;
      if (vector)
        await client.query(
          `INSERT INTO intelligence_feedback_embeddings(feedback_id,product_id,model,embedding) VALUES ($1,$2,$3,$4::jsonb)
        ON CONFLICT(feedback_id) DO UPDATE SET embedding=excluded.embedding,model=excluded.model`,
          [row.id, productId, "gemini-embedding-001", JSON.stringify(vector)],
        );
    }
    await client.query(
      `UPDATE intelligence_issues i SET
      first_seen=x.first_seen,last_seen=x.last_seen,updated_at=NOW()
      FROM (SELECT ev.issue_id,MIN(f.created_at) first_seen,MAX(f.created_at) last_seen
        FROM intelligence_issue_evidence ev JOIN feedbacks f ON f.id=ev.feedback_id
        WHERE f.product_id=$1::text AND f.deleted_at IS NULL GROUP BY ev.issue_id) x
      WHERE i.id=x.issue_id AND i.product_id=$1::uuid`,
      [productId],
    );
    await client.query("COMMIT");
    return { processed, linked, remaining };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listIssues(
  pool: Pool,
  productId: string,
  days: number,
): Promise<IssueStats[]> {
  const result = await pool.query(
    `SELECT i.id,i.title,i.category,i.status,i.priority,i.assignee,i.due_at,i.resolution_notes,i.first_seen,i.last_seen,
     COUNT(f.id)::integer AS evidence_count,
     COUNT(f.id) FILTER (WHERE LOWER(COALESCE(f.sentiment_label,'')) LIKE '%neg%')::integer AS negative_count,
     COUNT(f.id) FILTER (WHERE f.priority_label IN ('High Priority','Critical Priority'))::integer AS high_priority_count,
     COUNT(f.id) FILTER (WHERE f.created_at >= NOW()-($2::integer * INTERVAL '1 day'))::integer AS recent_count,
     COUNT(f.id) FILTER (WHERE f.created_at < NOW()-($2::integer * INTERVAL '1 day') AND f.created_at >= NOW()-(2*$2::integer*INTERVAL '1 day'))::integer AS previous_count,
     COALESCE(ARRAY_AGG(f.id::text ORDER BY f.created_at DESC) FILTER (WHERE f.id IS NOT NULL), '{}'::text[]) AS evidence_ids
   FROM intelligence_issues i LEFT JOIN intelligence_issue_evidence ev ON ev.issue_id=i.id
   LEFT JOIN feedbacks f ON f.id=ev.feedback_id AND f.deleted_at IS NULL
   WHERE i.product_id=$1 AND i.merged_into IS NULL GROUP BY i.id ORDER BY COUNT(f.id) DESC, i.last_seen DESC LIMIT 300`,
    [productId, days],
  );
  return result.rows.map((r) => ({
    ...r,
    severity:
      r.high_priority_count > 0
        ? "high"
        : r.negative_count > 0
          ? "medium"
          : "low",
    trend:
      r.recent_count >= 3 &&
      r.recent_count > Math.max(1, r.previous_count) * 1.5
        ? "emerging"
        : r.recent_count > r.previous_count
          ? "increasing"
          : r.recent_count < r.previous_count
            ? "decreasing"
            : "stable",
  }));
}

export async function evidenceForIssue(
  pool: Pool,
  productId: string,
  issueId: string,
) {
  const result = await pool.query(
    `SELECT f.id,f.feedback,f.created_at,f.category_name,f.sentiment_label,f.priority_label,f.rating
    FROM intelligence_issue_evidence ev JOIN intelligence_issues i ON i.id=ev.issue_id
    JOIN feedbacks f ON f.id=ev.feedback_id WHERE i.id=$2 AND i.product_id=$1 AND f.deleted_at IS NULL
    ORDER BY f.created_at DESC LIMIT 150`,
    [productId, issueId],
  );
  return result.rows;
}

export async function answerQuestion(
  pool: Pool,
  productId: string,
  question: string,
  days: number,
) {
  const issues = await listIssues(pool, productId, days);
  const queryTokens = tokens(question);
  const ranked = issues
    .map((issue) => ({
      issue,
      score: similarity(question, `${issue.title} ${issue.category}`),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || b.issue.evidence_count - a.issue.evidence_count,
    );
  const isTrend = /trend|rising|increase|emerg|new|worsen|change/i.test(
    question,
  );
  const isUrgent = /urgent|critical|sever|important|priorit|risk/i.test(
    question,
  );
  let selected = isTrend
    ? issues.filter((i) => i.trend === "emerging" || i.trend === "increasing")
    : isUrgent
      ? issues.filter((i) => i.severity === "high")
      : ranked.filter((r) => r.score > 0).map((r) => r.issue);
  if (!selected.length && !queryTokens.length) selected = issues.slice(0, 5);
  if (
    !selected.length &&
    /top|main|biggest|most|overview|summar/i.test(question)
  )
    selected = issues.slice(0, 5);
  const evidence = selected.slice(0, 5).map((i) => ({
    issue_id: i.id,
    title: i.title,
    occurrences: i.evidence_count,
    severity: i.severity,
    trend: i.trend,
    evidence_ids: i.evidence_ids.slice(0, 8),
  }));
  const answer = evidence.length
    ? `Found ${evidence.length} relevant issue${evidence.length === 1 ? "" : "s"} among ${issues.length} tracked clusters. ${evidence.map((i) => `“${i.title}” (${i.occurrences} feedback items; ${i.severity} severity; ${i.trend}).`).join(" ")} Review the linked evidence before making decisions.`
    : "No supported answer was found in the tracked issue evidence. Reconcile new feedback and try a more specific question.";
  return {
    answer,
    evidence,
    method: "deterministic_retrieval",
    limitations:
      "Keyword/Jaccard retrieval, not a generative explanation. Only linked feedback is considered. No causal inference or semantic embeddings.",
    period_days: days,
  };
}

/** Before/after comparison uses equal-length windows around resolution, with explicit sample size. */
export async function resolutionImpact(
  pool: Pool,
  productId: string,
  issueId: string,
  days = 30,
) {
  const result = await pool.query(
    `SELECT i.resolved_at, COUNT(f.id) FILTER(WHERE f.created_at < i.resolved_at AND f.created_at >= i.resolved_at-($3::int * interval '1 day'))::int before_count,
 COUNT(f.id) FILTER(WHERE f.created_at >= i.resolved_at AND f.created_at < i.resolved_at+($3::int * interval '1 day'))::int after_count,
 COUNT(f.id) FILTER(WHERE f.created_at < i.resolved_at AND f.created_at >= i.resolved_at-($3::int * interval '1 day') AND lower(coalesce(f.sentiment_label,'')) like '%neg%')::int before_negative,
 COUNT(f.id) FILTER(WHERE f.created_at >= i.resolved_at AND f.created_at < i.resolved_at+($3::int * interval '1 day') AND lower(coalesce(f.sentiment_label,'')) like '%neg%')::int after_negative
 FROM intelligence_issues i LEFT JOIN intelligence_issue_evidence e ON e.issue_id=i.id
 LEFT JOIN feedbacks f ON f.id=e.feedback_id AND f.deleted_at IS NULL
 WHERE i.id=$2 AND i.product_id=$1 GROUP BY i.id`,
    [productId, issueId, days],
  );
  if (!result.rowCount) return null;
  const r = result.rows[0];
  return {
    ...r,
    days,
    after_window_complete:
      !!r.resolved_at &&
      Date.now() >= new Date(r.resolved_at).getTime() + days * 86400000,
    note: "Observational association, not proof the resolution caused a change. New post-resolution feedback must first be linked to the issue.",
  };
}

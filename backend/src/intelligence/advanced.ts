import type { Pool } from "pg";
import { createHmac } from "node:crypto";
import { getConfig } from "../config/env.js";
import { reasonWithEvidence, embed } from "./ai.js";
import { searchFeedbackVectors } from "./vectorSearch.js";
import { listIssues } from "./issues.js";
import { Resend } from "resend";
import { logger } from "../logging/logger.js";

function selectDynamicEvidence(
  candidates: Array<{ id: string; issue_id: string; feedback: string; similarity?: number }>,
  question: string,
): Array<{ id: string; issue_id: string; feedback: string }> {
  if (!candidates.length) return [];

  // Detect query intent and scope
  const isBroadQuery =
    /(top|common|frequent|main|all|summary|summarize|list|overview|trends|breakdown|general|sentiment|complaints|issues|problems)/i.test(
      question,
    );
  const requestedCountMatch = question.match(/(?:top|first|give me|list)\s+(\d+)/i);
  const requestedCount = requestedCountMatch ? parseInt(requestedCountMatch[1], 10) : null;

  // Scale capacity dynamically: targeted queries get 2-6 items, broad requests get up to 12-16 items
  const maxCapacity = requestedCount
    ? Math.min(Math.max(requestedCount * 2 + 1, 3), 16)
    : isBroadQuery
      ? 12
      : 6;

  const hasSimilarity = candidates[0].similarity !== undefined;
  if (hasSimilarity) {
    const topSim = Number(candidates[0].similarity);
    // If top match is low, no reliable evidence exists
    if (topSim < 0.45) return [];

    // Relative threshold: items cannot be too distant from the best candidate
    const relativeGap = topSim >= 0.70 ? 0.16 : 0.14;
    const dynamicFloor = Math.max(0.45, topSim - relativeGap);

    const perIssueLimit = isBroadQuery ? 3 : 2;
    const issueCounts = new Map<string, number>();
    const selected: Array<{ id: string; issue_id: string; feedback: string }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      const sim = Number(item.similarity);
      if (sim < dynamicFloor) break;

      // Natural relevance cliff / elbow detection: if similarity drops sharply between consecutive items, stop
      if (selected.length >= (isBroadQuery ? 4 : 2) && i > 0) {
        const prevSim = Number(candidates[i - 1].similarity);
        if (prevSim - sim >= 0.12) break;
      }

      // Avoid single-issue dominance when answering broader questions
      const currentIssueCount = issueCounts.get(item.issue_id) || 0;
      if (currentIssueCount >= perIssueLimit && selected.length >= 3) continue;

      issueCounts.set(item.issue_id, currentIssueCount + 1);
      selected.push({ id: item.id, issue_id: item.issue_id, feedback: item.feedback });

      if (selected.length >= maxCapacity) break;
    }

    return selected;
  }

  // Lexical fallback: dynamic slicing without similarity scores
  const maxLexical = isBroadQuery ? 10 : 4;
  const issueCounts = new Map<string, number>();
  const selected: Array<{ id: string; issue_id: string; feedback: string }> = [];
  for (const item of candidates) {
    const currentCount = issueCounts.get(item.issue_id) || 0;
    if (currentCount >= 2 && selected.length >= 3) continue;
    issueCounts.set(item.issue_id, currentCount + 1);
    selected.push({ id: item.id, issue_id: item.issue_id, feedback: item.feedback });
    if (selected.length >= maxLexical) break;
  }
  return selected;
}

export async function askConversational(
  pool: Pool,
  productId: string,
  userId: string,
  question: string,
  conversationId?: string,
) {
  let id = conversationId;
  if (id) {
    const owner = await pool.query(
      "SELECT id FROM intelligence_conversations WHERE id=$1 AND product_id=$2 AND user_id=$3",
      [id, productId, userId],
    );
    if (!owner.rowCount) throw new Error("Conversation not found");
  } else {
    const fresh = await pool.query(
      "INSERT INTO intelligence_conversations(product_id,user_id,title) VALUES($1,$2,$3) RETURNING id",
      [productId, userId, question.slice(0, 90)],
    );
    id = fresh.rows[0].id;
  }
  const history = await pool.query(
    "SELECT role,content FROM intelligence_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 8",
    [id],
  );
  let evidence: Array<{ id: string; issue_id: string; feedback: string }> = [];
  let retrievalMethod = "semantic_pgvector";
  try {
    const queryVector = await embed(question, { productId });
    const nearest = await searchFeedbackVectors(
      pool,
      productId,
      queryVector,
      28,
    );
    evidence = selectDynamicEvidence(nearest, question);
  } catch (error) {
    // If embedding provider is unavailable, use an explicit lexical fallback.
    // Schema errors must NOT masquerade as normal AI provider outages.
    if (
      error instanceof Error &&
      /vector|embedding_vector|relation|operator does not exist/i.test(
        error.message,
      )
    )
      throw error;
    retrievalMethod = "lexical_fallback";
    logger.warn("Vector query embedding unavailable, using lexical fallback", {
      message: error instanceof Error ? error.message : "unknown",
    });
    const terms = [
      ...new Set(question.toLowerCase().match(/[a-z]{4,}/g) || []),
    ].slice(0, 30);
    if (terms.length) {
      const fallback = await pool.query(
        `SELECT f.id,f.feedback,i.id AS issue_id FROM feedbacks f
      JOIN intelligence_issue_evidence ev ON ev.feedback_id=f.id
      JOIN intelligence_issues i ON i.id=ev.issue_id AND i.product_id=$1::uuid AND i.merged_into IS NULL
      WHERE f.product_id=$1::text AND f.deleted_at IS NULL AND EXISTS (
       SELECT 1 FROM unnest($2::text[]) term WHERE f.feedback ILIKE '%'||term||'%')
      ORDER BY f.created_at DESC LIMIT 20`,
        [productId, terms],
      );
      evidence = selectDynamicEvidence(fallback.rows, question);
    }
  }
  let answer: string;
  if (!evidence.length)
    answer =
      "I could not find sufficient supporting feedback to answer this question. Please broaden your question or collect more feedback.";
  else
    try {
      answer = await reasonWithEvidence(
        question,
        evidence,
        history.rows.reverse(),
        { productId, userId, conversationId: id },
      );
    } catch (error) {
      logger.warn("Conversational AI unavailable", {
        message: error instanceof Error ? error.message : "unknown",
      });
      answer =
        "The AI answer is temporarily unavailable. Supporting feedback is listed below so you can investigate directly.";
    }
  const citations = evidence.map(
    (e: { id: string; issue_id: string; feedback: string }, index: number) => ({
      marker: `[${index + 1}]`,
      feedback_id: e.id,
      issue_id: e.issue_id,
      feedback: e.feedback,
      snippet: e.feedback ? e.feedback.slice(0, 100) : "",
    }),
  );
  await pool.query(
    "INSERT INTO intelligence_messages(conversation_id,role,content) VALUES($1,$2,$3)",
    [id, "user", question],
  );
  await pool.query(
    "INSERT INTO intelligence_messages(conversation_id,role,content,citations) VALUES($1,$2,$3,$4::jsonb)",
    [id, "assistant", answer, JSON.stringify(citations)],
  );
  return {
    conversation_id: id,
    answer,
    citations,
    method: evidence.length
      ? `grounded_gemini_${retrievalMethod}`
      : "no_evidence",
  };
}
export async function createSignals(pool: Pool, productId: string) {
  const issues = await listIssues(pool, productId, 30);
  let inserted = 0;
  for (const issue of issues) {
    if (["resolved", "dismissed"].includes(issue.status)) continue;
    const kind =
      issue.trend === "emerging"
        ? "emerging"
        : issue.high_priority_count > 0
          ? "high_priority"
          : issue.due_at && new Date(issue.due_at).getTime() < Date.now()
            ? "overdue"
            : null;
    if (!kind) continue;
    const r = await pool.query(
      `INSERT INTO intelligence_notifications(product_id,issue_id,kind,window_start,title)
   VALUES($1,$2,$3,current_date,$4) ON CONFLICT(issue_id,kind,window_start) DO NOTHING RETURNING id`,
      [productId, issue.id, kind, issue.title],
    );
    if (r.rowCount) inserted++;
  }
  return { inserted };
}
export async function deliverAlertEmails(pool: Pool, productId: string) {
  const config = getConfig();
  const pref = await pool.query(
    "SELECT email_enabled,recipient_email FROM intelligence_alert_preferences WHERE product_id=$1",
    [productId],
  );
  const email = pref.rows[0]?.recipient_email;
  if (!pref.rows[0]?.email_enabled || !email || !config.resendApiKey)
    return { sent: 0, reason: "Email disabled or provider not configured" };
  const pending = await pool.query(
    `SELECT n.id,n.kind,n.title FROM intelligence_notifications n
  WHERE n.product_id=$1 AND n.emailed_at IS NULL AND n.email_error IS NULL ORDER BY n.created_at LIMIT 10`,
    [productId],
  );
  const resend = new Resend(config.resendApiKey);
  let sent = 0;
  for (const note of pending.rows) {
    // Reserve delivery first: retries cannot produce duplicate messages after a successful provider call.
    const reserved = await pool.query(
      `UPDATE intelligence_notifications SET email_error='sending' WHERE id=$1 AND email_error IS NULL RETURNING id`,
      [note.id],
    );
    if (!reserved.rowCount) continue;
    try {
      const response = await resend.emails.send({
        from: config.resendFromEmail,
        to: email,
        subject: `Feedback Desk alert: ${note.kind.replace("_", " ")}`,
        text: `${note.title}\n\nReview this issue in Feedback Desk AI.\n\nYou can disable email alerts in Issue Intelligence settings.`,
      });
      if (response.error) throw new Error(response.error.message);
      await pool.query(
        "UPDATE intelligence_notifications SET emailed_at=now(),email_error=NULL WHERE id=$1",
        [note.id],
      );
      sent++;
    } catch (error) {
      await pool.query(
        "UPDATE intelligence_notifications SET email_error=$2 WHERE id=$1",
        [
          note.id,
          String(
            error instanceof Error ? error.message : "Delivery failed",
          ).slice(0, 300),
        ],
      );
    }
  }
  return { sent };
}
export function customerToken(productId: string, email: string) {
  return createHmac("sha256", getConfig().linkSecret)
    .update(`${productId}:${email.trim().toLowerCase()}`)
    .digest("hex");
}
export async function syncCustomerIdentities(pool: Pool, productId: string) {
  const rows = await pool.query(
    `SELECT f.id,f.email FROM feedbacks f LEFT JOIN intelligence_customer_identities ci ON ci.feedback_id=f.id
  WHERE f.product_id=$1 AND f.deleted_at IS NULL AND nullif(trim(f.email),'') IS NOT NULL AND ci.feedback_id IS NULL LIMIT 300`,
    [productId],
  );
  for (const item of rows.rows) {
    const token = customerToken(productId, item.email);
    const opted = await pool.query(
      "SELECT 1 FROM intelligence_customer_optouts WHERE product_id=$1 AND customer_token=$2",
      [productId, token],
    );
    if (opted.rowCount) continue;
    await pool.query(
      `INSERT INTO intelligence_customer_identities(feedback_id,product_id,customer_token)
  VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
      [item.id, productId, token],
    );
  }
  return { linked: rows.rowCount };
}

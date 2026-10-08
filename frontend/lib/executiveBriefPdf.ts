import { jsPDF } from "jspdf";
import type { ExecutiveBrief } from "@/types";
import { formatFriendlyDate, formatFriendlyDateTime } from "@/lib/dates";

type PdfOptions = {
  productName: string;
  periodLabel: string;
};

const MARGIN_X = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 52;
const PAGE_WIDTH = 595.28; // A4 pt
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  ink: [24, 24, 27] as [number, number, number],
  muted: [82, 82, 91] as [number, number, number],
  line: [212, 212, 216] as [number, number, number],
  accent: [234, 88, 12] as [number, number, number],
  soft: [250, 250, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function sanitizeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function wrapText(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text || "", maxWidth) as string[];
}

export function downloadExecutiveBriefPdf(
  brief: ExecutiveBrief,
  options: PdfOptions,
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  let y = MARGIN_TOP;
  const status =
    brief.attention_status || brief.macro_health_status || "Stable";
  const period =
    brief.period_label || options.periodLabel || brief.period_key || "Period";

  const ensureSpace = (needed: number) => {
    if (y + needed <= PAGE_HEIGHT - MARGIN_BOTTOM) return;
    doc.addPage();
    y = MARGIN_TOP;
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.6);
      doc.line(
        MARGIN_X,
        PAGE_HEIGHT - 36,
        PAGE_WIDTH - MARGIN_X,
        PAGE_HEIGHT - 36,
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text("Feedback Desk AI · Confidential", MARGIN_X, PAGE_HEIGHT - 22);
      doc.text(
        `Page ${i} of ${pageCount}`,
        PAGE_WIDTH - MARGIN_X,
        PAGE_HEIGHT - 22,
        { align: "right" },
      );
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(36);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.ink);
    doc.text(title.toUpperCase(), MARGIN_X, y);
    y += 6;
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(1.5);
    doc.line(MARGIN_X, y, MARGIN_X + 36, y);
    y += 14;
  };

  const bodyText = (text: string, opts?: { muted?: boolean; size?: number }) => {
    const size = opts?.size ?? 10;
    const lines = wrapText(doc, text, CONTENT_WIDTH, size);
    const lineHeight = size + 3;
    ensureSpace(lines.length * lineHeight + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts?.muted ? COLORS.muted : COLORS.ink));
    doc.text(lines, MARGIN_X, y);
    y += lines.length * lineHeight + 8;
  };

  const bullet = (text: string, meta?: string) => {
    const bulletIndent = 12;
    const lines = wrapText(doc, text, CONTENT_WIDTH - bulletIndent, 10);
    const metaLines = meta
      ? wrapText(doc, meta, CONTENT_WIDTH - bulletIndent, 8)
      : [];
    const blockHeight =
      lines.length * 13 + (metaLines.length ? metaLines.length * 11 + 2 : 0) + 8;
    ensureSpace(blockHeight);
    doc.setFillColor(...COLORS.accent);
    doc.circle(MARGIN_X + 3, y - 2.5, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.ink);
    doc.text(lines, MARGIN_X + bulletIndent, y);
    y += lines.length * 13;
    if (metaLines.length) {
      y += 2;
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(metaLines, MARGIN_X + bulletIndent, y);
      y += metaLines.length * 11;
    }
    y += 8;
  };

  // Cover band
  doc.setFillColor(...COLORS.ink);
  doc.rect(0, 0, PAGE_WIDTH, 104, "F");
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 104, PAGE_WIDTH, 3, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("FEEDBACK DESK AI", MARGIN_X, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("AI Executive Brief", MARGIN_X, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(options.productName || "Product", MARGIN_X, 84);

  y = 132;

  // Meta strip
  doc.setFillColor(...COLORS.soft);
  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 54, 4, 4, "F");
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, 54, 4, 4, "S");

  const metaLeft = MARGIN_X + 14;
  const metaMid = MARGIN_X + CONTENT_WIDTH / 2 + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("STATUS", metaLeft, y + 16);
  doc.text("PERIOD", metaMid, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.ink);
  doc.text(status, metaLeft, y + 34);
  doc.text(period, metaMid, y + 34);
  y += 70;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  const generated = formatFriendlyDateTime(brief.generated_at);
  const windowLabel =
    brief.window_start && brief.window_end
      ? `${formatFriendlyDate(brief.window_start)} – ${formatFriendlyDate(brief.window_end)}`
      : null;
  doc.text(
    [
      generated ? `Generated ${generated}` : null,
      windowLabel ? `Analyzed ${windowLabel}` : null,
    ]
      .filter(Boolean)
      .join("  ·  "),
    MARGIN_X,
    y,
  );
  y += 22;

  // Headline + summary
  const headlineLines = wrapText(doc, brief.headline || "Executive Brief", CONTENT_WIDTH, 14);
  ensureSpace(headlineLines.length * 18 + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.ink);
  doc.text(headlineLines, MARGIN_X, y);
  y += headlineLines.length * 18 + 10;

  if (brief.executive_summary) {
    bodyText(brief.executive_summary, { size: 10 });
  }

  if (brief.data_context) {
    sectionTitle("Period snapshot");
    const ctx = brief.data_context;
    const snapshot = [
      `${ctx.total_feedback} feedback items analyzed`,
      `${ctx.positive} positive · ${ctx.negative} negative · ${ctx.neutral} neutral · ${ctx.mixed} mixed`,
      `${ctx.high_priority} high priority · ${ctx.medium_priority} medium · ${ctx.low_priority} low`,
      `Evidence strength: ${ctx.evidence_strength}`,
    ];
    for (const line of snapshot) bodyText(line, { muted: true, size: 9 });
    if (ctx.evidence_note) bodyText(ctx.evidence_note, { muted: true, size: 9 });
  }

  if (brief.key_findings?.length) {
    sectionTitle("Key findings");
    for (const finding of brief.key_findings) {
      bullet(
        finding.finding,
        `${finding.evidence_count} supporting feedback item${finding.evidence_count === 1 ? "" : "s"}`,
      );
    }
  }

  if (brief.reported_issues?.length) {
    sectionTitle("Reported customer issues");
    for (const issue of brief.reported_issues) {
      const topic = issue.topic ? `${issue.topic}` : "Issue";
      const severity = issue.severity
        ? `${issue.severity} severity`
        : "unspecified severity";
      bullet(
        `${topic}: ${issue.issue}`,
        `${severity} · ${issue.evidence_count} supporting feedback item${issue.evidence_count === 1 ? "" : "s"}`,
      );
    }
  }

  if (brief.root_cause_hypotheses?.length) {
    sectionTitle("Root-cause hypotheses");
    for (const hypothesis of brief.root_cause_hypotheses) {
      bullet(
        hypothesis.hypothesis,
        `${hypothesis.confidence} confidence · ${hypothesis.evidence_feedback_ids?.length || 0} supporting item${(hypothesis.evidence_feedback_ids?.length || 0) === 1 ? "" : "s"}`,
      );
    }
  }

  if (brief.recommended_actions?.length) {
    sectionTitle("Recommended actions");
    const actions = [...brief.recommended_actions].sort(
      (a, b) => (a.rank || 0) - (b.rank || 0),
    );
    for (const action of actions) {
      ensureSpace(56);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.ink);
      doc.text(
        `${action.rank || ""}. ${action.title}`.trim(),
        MARGIN_X,
        y,
      );
      y += 13;
      bodyText(action.action, { size: 10 });
      bodyText(
        [
          action.area ? `Area: ${action.area}` : null,
          action.urgency ? `Urgency: ${action.urgency}` : null,
          action.reason ? `Why: ${action.reason}` : null,
          action.expected_effect
            ? `Expected effect: ${action.expected_effect}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
        { muted: true, size: 9 },
      );
    }
  }

  if (brief.strengths?.length) {
    sectionTitle("Strengths to keep");
    for (const strength of brief.strengths) {
      bullet(
        strength.strength,
        `${strength.evidence_count} supporting feedback item${strength.evidence_count === 1 ? "" : "s"}`,
      );
    }
  }

  drawFooter();

  const productSlug = sanitizeFilename(options.productName) || "product";
  const periodSlug = sanitizeFilename(period) || "period";
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`executive-brief-${productSlug}-${periodSlug}-${dateSlug}.pdf`);
}

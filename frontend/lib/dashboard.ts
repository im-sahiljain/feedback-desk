import { formatFriendlyDate } from "@/lib/dates";
import type { DashboardChangeDelta, DashboardPeriod } from "@/types";

export const DASHBOARD_PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_EVIDENCE_IDS = 200;

/** Normalize evidence feedback IDs for deep links (valid UUIDs only, capped). */
export function normalizeEvidenceIds(ids: string[] | null | undefined): string[] {
  if (!ids?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = String(raw || "").trim().toLowerCase();
    if (!UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_EVIDENCE_IDS) break;
  }
  return out;
}

export function feedbackFilterHref(opts: {
  priority?: string;
  sentiment?: string;
  category?: string;
  status?: string;
  highlight?: string;
  date?: string;
  ids?: string[];
  productId?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.productId) params.set("product_id", opts.productId);
  if (opts.priority) params.set("priority", opts.priority);
  if (opts.sentiment) params.set("sentiment", opts.sentiment);
  if (opts.category) params.set("category", opts.category);
  if (opts.status) params.set("status", opts.status);
  if (opts.highlight) params.set("highlight", opts.highlight);
  if (opts.date) params.set("date", opts.date);
  const ids = normalizeEvidenceIds(opts.ids);
  if (ids.length > 0) params.set("ids", ids.join(","));
  const qs = params.toString();
  return qs ? `/feedback?${qs}` : "/feedback";
}

export function insightsHref(opts?: {
  period?: DashboardPeriod;
  category?: string;
}): string {
  const params = new URLSearchParams();
  if (opts?.period) params.set("period", opts.period);
  if (opts?.category) params.set("category", opts.category);
  const qs = params.toString();
  return qs ? `/insights?${qs}` : "/insights";
}

export function formatChangeTone(change: DashboardChangeDelta | null | undefined): string {
  if (!change) return "text-slate-500 dark:text-slate-400";
  if (change.direction === "up" || change.direction === "new") return "text-rose-600 dark:text-rose-400 font-semibold";
  if (change.direction === "down") return "text-emerald-600 dark:text-emerald-400 font-semibold";
  return "text-slate-500 dark:text-slate-400";
}

export function formatPositiveChangeTone(change: DashboardChangeDelta | null | undefined): string {
  if (!change) return "text-slate-500 dark:text-slate-400";
  if (change.direction === "up" || change.direction === "new") return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (change.direction === "down") return "text-amber-600 dark:text-amber-400 font-medium";
  return "text-slate-500 dark:text-slate-400";
}

export function formatVolumeChangeTone(change: DashboardChangeDelta | null | undefined): string {
  if (!change) return "text-slate-500 dark:text-slate-400";
  if (change.direction === "up" || change.direction === "new") return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (change.direction === "down") return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-slate-500 dark:text-slate-400 font-medium";
}

export function formatRangeLabel(fromIso: string, toIso: string): string {
  return `${formatFriendlyDate(fromIso)} – ${formatFriendlyDate(toIso)}`;
}

export function relativeTimeLabel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

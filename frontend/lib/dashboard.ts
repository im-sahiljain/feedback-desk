import { formatFriendlyDate } from "@/lib/dates";
import type { DashboardChangeDelta, DashboardPeriod } from "@/types";

export const DASHBOARD_PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function feedbackFilterHref(opts: {
  priority?: string;
  sentiment?: string;
  category?: string;
  status?: string;
  highlight?: string;
  date?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.priority) params.set("priority", opts.priority);
  if (opts.sentiment) params.set("sentiment", opts.sentiment);
  if (opts.category) params.set("category", opts.category);
  if (opts.status) params.set("status", opts.status);
  if (opts.highlight) params.set("highlight", opts.highlight);
  if (opts.date) params.set("date", opts.date);
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
  if (!change) return "text-muted-foreground";
  if (change.direction === "up") return "text-destructive";
  if (change.direction === "down") return "text-emerald-600 dark:text-emerald-400";
  if (change.direction === "new") return "text-amber-700 dark:text-amber-300";
  return "text-muted-foreground";
}

export function formatPositiveChangeTone(change: DashboardChangeDelta | null | undefined): string {
  if (!change) return "text-muted-foreground";
  if (change.direction === "up") return "text-emerald-600 dark:text-emerald-400";
  if (change.direction === "down") return "text-muted-foreground";
  if (change.direction === "new") return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
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

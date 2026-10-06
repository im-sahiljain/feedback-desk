"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatChangeTone,
  feedbackFilterHref,
} from "@/lib/dashboard";
import type { DashboardSummary } from "@/types";
import { AlertTriangle, ArrowRight, Bot, MessageSquareText, SmilePlus } from "lucide-react";

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function DashboardKpiRow({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  if (loading && !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const sentimentLabel =
    summary.sentiment.direction === "improving"
      ? "Improving"
      : summary.sentiment.direction === "worsening"
        ? "Worsening"
        : summary.sentiment.direction === "stable"
          ? "Stable"
          : "Not enough data";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            Feedback received
          </div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {summary.feedbackCount}
          </p>
          <p className={`text-xs ${formatChangeTone(summary.feedbackCountChange)}`}>
            {summary.feedbackCountChange.display} vs previous period
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <SmilePlus className="h-3.5 w-3.5" />
            Customer sentiment
          </div>
          <p className="text-2xl font-semibold tracking-tight">{sentimentLabel}</p>
          {summary.sentiment.analyzed > 0 ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Positive {summary.sentiment.positivePct ?? 0}% · Negative{" "}
              {summary.sentiment.negativePct ?? 0}% · Mixed{" "}
              {summary.sentiment.mixedPct ?? 0}% · Neutral{" "}
              {summary.sentiment.neutralPct ?? 0}%
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Awaiting analysis</p>
          )}
          {summary.negativeChange.direction !== "flat" && (
            <p
              className={`text-xs ${
                summary.negativeChange.direction === "down"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : summary.negativeChange.direction === "up"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              Negative feedback {summary.negativeChange.display}
            </p>
          )}
        </CardContent>
      </Card>

      <Link
        href={feedbackFilterHref({ priority: "high" })}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card
          className={
            summary.needsAttention.total > 0
              ? "h-full border-destructive/30 bg-destructive/5 transition-colors hover:bg-destructive/10"
              : "h-full transition-colors hover:bg-muted/40"
          }
        >
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Needs attention
            </div>
            <p
              className={`text-3xl font-semibold tabular-nums tracking-tight ${
                summary.needsAttention.total > 0 ? "text-destructive" : ""
              }`}
            >
              {summary.needsAttention.total}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.needsAttention.highPriority} high priority
              {summary.needsAttention.failedOrNeedsReview > 0
                ? ` · ${summary.needsAttention.failedOrNeedsReview} need review`
                : ""}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
              Review feedback
              <ArrowRight className="h-3 w-3" />
            </span>
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            AI analysis
          </div>
          <p className="text-3xl font-semibold tabular-nums tracking-tight">
            {summary.processing.analyzed}
          </p>
          <p className="text-xs text-muted-foreground">
            {summary.processing.pending > 0
              ? `${summary.processing.pending} awaiting analysis`
              : "Up to date"}
            {summary.processing.failed > 0
              ? ` · ${summary.processing.failed} failed`
              : ""}
          </p>
          {summary.processing.failed > 0 && (
            <Link
              href={feedbackFilterHref({ status: "failed" })}
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive"
            >
              Review failures
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

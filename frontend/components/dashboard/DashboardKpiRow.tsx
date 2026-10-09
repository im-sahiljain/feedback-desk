"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatChangeTone,
  formatVolumeChangeTone,
  feedbackFilterHref,
} from "@/lib/dashboard";
import { formatFriendlyDate } from "@/lib/dates";
import type { DashboardChangeDelta, DashboardSummary } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Info,
  MessageSquareText,
  SmilePlus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

function KpiInfoTooltip({
  description,
  currentRange,
  priorRange,
}: {
  description: string;
  currentRange: string;
  priorRange?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        asChild
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <span
          role="button"
          tabIndex={0}
          aria-label="Metric information"
          className="inline-flex cursor-pointer text-muted-foreground/60 transition-colors hover:text-foreground focus:outline-none"
        >
          <Info className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] space-y-1.5 p-2.5 text-xs leading-normal">
        <p className="font-semibold text-foreground">{description}</p>
        <div className="space-y-1 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Current:</span>{" "}
            {currentRange}
          </p>
          {priorRange ? (
            <p>
              <span className="font-semibold text-foreground">Prior:</span>{" "}
              {priorRange}
            </p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function DeltaDisplay({ change }: { change: DashboardChangeDelta }) {
  if (!change) return null;

  if (change.display.includes("→")) {
    const parts = change.display.split("→");
    return (
      <span className="inline-flex items-center gap-0.5">
        <span>{parts[0].trim()}</span>
        <ArrowRight className="h-3 w-3 shrink-0" />
        <span>{parts[1].trim()}</span>
      </span>
    );
  }

  const cleanText = change.display.replace(/^[↑↓]\s*/, "");

  if (change.direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5">
        <TrendingUp className="h-3 w-3 shrink-0" />
        <span>{cleanText}</span>
      </span>
    );
  }

  if (change.direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5">
        <TrendingDown className="h-3 w-3 shrink-0" />
        <span>{cleanText}</span>
      </span>
    );
  }

  return <span>{change.display}</span>;
}

function KpiSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div>
          <div className="flex h-5 items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
          </div>
          <div className="my-2 flex h-9 items-center">
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex h-5 items-center">
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex h-5 items-center">
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
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

  const { summary, period } = data;
  const currentRange = `${formatFriendlyDate(period.from)} – ${formatFriendlyDate(period.to)}`;
  const priorRange = `${formatFriendlyDate(period.comparisonFrom)} – ${formatFriendlyDate(period.comparisonTo)}`;

  const sentimentLabel =
    summary.sentiment.direction === "improving"
      ? "Improving"
      : summary.sentiment.direction === "worsening"
        ? "Worsening"
        : summary.sentiment.direction === "stable"
          ? "Stable"
          : summary.sentiment.direction === "baseline"
            ? "Baseline set"
            : "Not enough data";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Feedback received */}
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="flex h-5 items-center justify-between text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-3.5 w-3.5" />
                <span>Feedback received</span>
              </div>
              <KpiInfoTooltip
                description="Total feedback received vs. prior period."
                currentRange={currentRange}
                priorRange={priorRange}
              />
            </div>
            <div className="my-2 flex h-9 items-center">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                {summary.feedbackCount}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex h-5 items-center">
              <p className={`flex items-center gap-1 ${formatVolumeChangeTone(summary.feedbackCountChange)}`}>
                <DeltaDisplay change={summary.feedbackCountChange} />
                <span>vs previous period</span>
              </p>
            </div>
            <div className="flex h-5 items-center">
              {summary.negativeChange.direction !== "flat" ? (
                <Link
                  href={feedbackFilterHref({ sentiment: "negative" })}
                  className={`inline-flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${formatChangeTone(
                    summary.negativeChange
                  )}`}
                >
                  <span>Negative feedback</span>
                  <DeltaDisplay change={summary.negativeChange} />
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              ) : (
                <span className="text-muted-foreground/70">No surge in negative</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Customer sentiment */}
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="flex h-5 items-center justify-between text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <SmilePlus className="h-3.5 w-3.5" />
                <span>Customer sentiment</span>
              </div>
              <KpiInfoTooltip
                description="Customer sentiment trajectory & distribution."
                currentRange={currentRange}
                priorRange={priorRange}
              />
            </div>
            <div className="my-2 flex h-9 items-center">
              <p className="text-2xl font-bold tracking-tight text-foreground leading-none truncate">
                {sentimentLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex h-5 items-center">
              {summary.sentiment.analyzed > 0 ? (
                <p className="truncate">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Positive {summary.sentiment.positivePct ?? 0}%
                  </span>
                  {" · "}
                  <span
                    className={
                      (summary.sentiment.negativePct ?? 0) > 0
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                    }
                  >
                    Negative {summary.sentiment.negativePct ?? 0}%
                  </span>
                </p>
              ) : (
                <p>Awaiting analysis</p>
              )}
            </div>
            <div className="flex h-5 items-center">
              {summary.sentiment.analyzed > 0 ? (
                <p className="truncate">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    Mixed {summary.sentiment.mixedPct ?? 0}%
                  </span>
                  {" · "}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    Neutral {summary.sentiment.neutralPct ?? 0}%
                  </span>
                </p>
              ) : (
                <span className="text-muted-foreground/70">No sentiment data</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Needs attention */}
      <Link
        href={feedbackFilterHref({ priority: "high" })}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card
          className={
            summary.needsAttention.total > 0
              ? "h-full border-rose-200 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/20 transition-colors hover:bg-rose-100/50 dark:hover:bg-rose-950/40"
              : "h-full transition-colors hover:bg-muted/40"
          }
        >
          <CardContent className="flex h-full flex-col justify-between p-4">
            <div>
              <div className="flex h-5 items-center justify-between text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Needs attention</span>
                </div>
                <KpiInfoTooltip
                  description="High priority and review-needed feedback items."
                  currentRange={currentRange}
                />
              </div>
              <div className="my-2 flex h-9 items-center">
                <p
                  className={`text-3xl font-semibold tabular-nums tracking-tight leading-none ${
                    summary.needsAttention.total > 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {summary.needsAttention.total}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <div className="flex h-5 items-center">
                <p className="truncate">
                  <span
                    className={
                      summary.needsAttention.highPriority > 0
                        ? "font-semibold text-rose-600 dark:text-rose-400"
                        : "text-slate-500 dark:text-slate-400"
                    }
                  >
                    {summary.needsAttention.highPriority} high priority
                  </span>
                  {summary.needsAttention.failedOrNeedsReview > 0 && (
                    <>
                      {" · "}
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {summary.needsAttention.failedOrNeedsReview} need review
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex h-5 items-center">
                <span className="inline-flex items-center gap-1 font-medium text-foreground hover:underline">
                  Review feedback
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 4. AI analysis */}
      <Card className="h-full">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <div>
            <div className="flex h-5 items-center justify-between text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5" />
                <span>AI analysis</span>
              </div>
              <KpiInfoTooltip
                description="AI analysis pipeline status for feedback in this period."
                currentRange={currentRange}
              />
            </div>
            <div className="my-2 flex h-9 items-center">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                {summary.processing.analyzed}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex h-5 items-center">
              <p className="truncate">
                {summary.processing.pending > 0 ? (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {summary.processing.pending} awaiting analysis
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Up to date
                  </span>
                )}
                {summary.processing.failed > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {summary.processing.failed} failed
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex h-5 items-center">
              {summary.processing.failed > 0 ? (
                <Link
                  href={feedbackFilterHref({ status: "failed" })}
                  className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Review failures
                  <ArrowRight className="h-3 w-3 shrink-0" />
                </Link>
              ) : (
                <span className="text-muted-foreground/70">0 processing errors</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

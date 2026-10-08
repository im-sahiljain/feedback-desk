"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  Suspense,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  RefreshCw,
  Target,
  CheckCircle2,
  Activity,
  Zap,
  Clock,
  ChevronDown,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ExecutiveBrief, Feedback, ImpactCorrelationMetrics } from "@/types";
import { normalizeBackendFeedbacks } from "@/lib/normalization";
import { formatFriendlyDate, formatFriendlyDateTime } from "@/lib/dates";
import { feedbackFilterHref, normalizeEvidenceIds } from "@/lib/dashboard";
import { downloadExecutiveBriefPdf } from "@/lib/executiveBriefPdf";
import { api } from "@/lib/api";

type PeriodType = "today" | "7d" | "30d" | "90d";

function EvidenceCountLink({
  ids,
  productId,
  children,
  className,
}: {
  ids?: string[] | null;
  productId?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const evidenceIds = normalizeEvidenceIds(ids);
  if (evidenceIds.length === 0) {
    return <span className={className}>{children}</span>;
  }
  return (
    <a
      href={feedbackFilterHref({
        ids: evidenceIds,
        productId: productId || undefined,
      })}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className
          ? `${className} text-primary underline-offset-2 hover:underline`
          : "text-primary underline-offset-2 hover:underline"
      }
      title="Open supporting feedback in a new tab"
    >
      {children}
    </a>
  );
}

const SENTIMENT_COLORS: Record<string, string> = {
  Positive: "hsl(var(--success))",
  Neutral: "hsl(var(--warning))",
  Negative: "hsl(var(--destructive))",
  Mixed: "hsl(var(--info))",
};

const PRIORITY_COLORS: Record<string, string> = {
  High: "hsl(var(--destructive))",
  Medium: "hsl(var(--warning))",
  Low: "hsl(var(--info))",
};

function formatPeriodLabel(period: PeriodType): string {
  switch (period) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    default:
      return period;
  }
}

function InsightsContent() {
  const { currentProduct, isBootstrapping } = useApp();
  const searchParams = useSearchParams();
  const periodFromUrl = searchParams.get("period");
  const initialPeriod: PeriodType =
    periodFromUrl === "7d" ||
    periodFromUrl === "30d" ||
    periodFromUrl === "90d" ||
    periodFromUrl === "today"
      ? periodFromUrl
      : "today";

  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodType>(initialPeriod);

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [executiveBrief, setExecutiveBrief] = useState<ExecutiveBrief | null>(
    null,
  );
  const [impactMetrics, setImpactMetrics] =
    useState<ImpactCorrelationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isRefreshingBrief, setIsRefreshingBrief] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(true);
  const briefBadgesRef = useRef<HTMLDivElement>(null);
  const briefBadgesFirstRect = useRef<DOMRect | null>(null);

  const toggleBriefOpen = () => {
    if (briefBadgesRef.current) {
      briefBadgesFirstRect.current =
        briefBadgesRef.current.getBoundingClientRect();
    }
    setBriefOpen((open) => !open);
  };

  useLayoutEffect(() => {
    const el = briefBadgesRef.current;
    const first = briefBadgesFirstRect.current;
    if (!el || !first) return;
    briefBadgesFirstRect.current = null;

    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      {
        duration: 480,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    );
  }, [briefOpen]);

  /** Live charts/metrics for the selected period + optional stored AI brief */
  const loadPeriodData = useCallback(
    (productId: string, period: PeriodType) => {
      setIsLoading(true);
      setGenerateError(null);
      setExecutiveBrief(null);

      api.feedbacks
        .list(productId, period)
        .then((data: any) => {
          setFeedback(normalizeBackendFeedbacks(data, productId));
        })
        .catch(() => setFeedback([]))
        .finally(() => setIsLoading(false));

      api.analytics
        .getSummary(productId, period)
        .then((res: any) => {
          if (res?.impact_correlation) {
            setImpactMetrics(res.impact_correlation);
          } else {
            setImpactMetrics(null);
          }
        })
        .catch(() => setImpactMetrics(null));

      api.analytics
        .getExecutiveBrief(productId, false, period, undefined, undefined, true)
        .then((res: any) => {
          const brief = res?.brief || null;
          if (brief && brief.period_key && brief.period_key !== period) {
            setExecutiveBrief(null);
            return;
          }
          setExecutiveBrief(brief);
        })
        .catch(() => setExecutiveBrief(null));
    },
    [],
  );

  /** Generate or regenerate AI brief — persists to DB; does not gate charts */
  const loadExecutiveBrief = useCallback(
    (productId: string, period: PeriodType, forceRefresh = false) => {
      setGenerateError(null);
      if (forceRefresh) {
        setIsRefreshingBrief(true);
      } else {
        setIsBriefLoading(true);
      }

      api.analytics
        .getExecutiveBrief(
          productId,
          forceRefresh,
          period,
          undefined,
          undefined,
          false,
        )
        .then((res: any) => {
          if (res?.brief) {
            setExecutiveBrief(res.brief);
          } else {
            setExecutiveBrief(null);
            setGenerateError(
              res?.message ||
                "No analyzed feedback in this period to generate a brief.",
            );
          }
        })
        .catch((err: any) => {
          setGenerateError(
            err?.message === "Unauthorized"
              ? "Session expired. Please refresh the page or sign in again."
              : err?.message || "Failed to generate brief. Try again.",
          );
        })
        .finally(() => {
          setIsBriefLoading(false);
          setIsRefreshingBrief(false);
        });
    },
    [],
  );

  useEffect(() => {
    if (!currentProduct) return;
    loadPeriodData(currentProduct.id, selectedPeriod);
  }, [currentProduct, selectedPeriod, loadPeriodData]);

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  const handleGenerateBrief = (forceRefresh = false) => {
    if (!currentProduct) return;
    loadExecutiveBrief(currentProduct.id, selectedPeriod, forceRefresh);
  };

  const handleRegenerateBrief = () => {
    handleGenerateBrief(true);
  };

  const handleDownloadBriefPdf = () => {
    if (!executiveBrief || !currentProduct) return;
    downloadExecutiveBriefPdf(executiveBrief, {
      productName: currentProduct.name,
      periodLabel,
    });
  };

  const analyzedFeedback = feedback.filter((f) => f.analysis);

  const stats = {
    total: feedback.length,
    analyzed: analyzedFeedback.length,
    positive: analyzedFeedback.filter(
      (f) => f.analysis?.sentiment === "positive",
    ).length,
    negative: analyzedFeedback.filter(
      (f) => f.analysis?.sentiment === "negative",
    ).length,
    neutral: analyzedFeedback.filter((f) => f.analysis?.sentiment === "neutral")
      .length,
    mixed: analyzedFeedback.filter((f) => f.analysis?.sentiment === "mixed")
      .length,
    highPriority: analyzedFeedback.filter(
      (f) => f.analysis?.priority === "high",
    ).length,
    mediumPriority: analyzedFeedback.filter(
      (f) => f.analysis?.priority === "medium",
    ).length,
    lowPriority: analyzedFeedback.filter((f) => f.analysis?.priority === "low")
      .length,
    avgRating:
      feedback.filter((f) => f.rating).length > 0
        ? feedback
            .filter((f) => f.rating)
            .reduce((acc, f) => acc + (f.rating || 0), 0) /
          feedback.filter((f) => f.rating).length
        : impactMetrics?.average_rating || 0,
  };

  const sentimentScore =
    stats.analyzed > 0
      ? (((stats.positive - stats.negative) / stats.analyzed) * 100).toFixed(0)
      : 0;

  const sentimentData = [
    { name: "Positive", value: stats.positive },
    { name: "Neutral", value: stats.neutral },
    { name: "Negative", value: stats.negative },
    { name: "Mixed", value: stats.mixed },
  ].map((d) => ({
    ...d,
    color: SENTIMENT_COLORS[d.name] || "hsl(var(--muted-foreground))",
  }));

  const priorityData = [
    { name: "High", value: stats.highPriority },
    { name: "Medium", value: stats.mediumPriority },
    { name: "Low", value: stats.lowPriority },
  ].map((d) => ({
    ...d,
    color: PRIORITY_COLORS[d.name] || "hsl(var(--muted-foreground))",
  }));

  const categoryData = analyzedFeedback
    .reduce(
      (acc, f) => {
        const category = f.analysis?.category || "Uncategorized";
        const existing = acc.find((item) => item.name === category);
        if (existing) {
          existing.count++;
          if (f.analysis?.sentiment === "positive") existing.positive++;
          if (f.analysis?.sentiment === "negative") existing.negative++;
        } else {
          acc.push({
            name: category,
            count: 1,
            positive: f.analysis?.sentiment === "positive" ? 1 : 0,
            negative: f.analysis?.sentiment === "negative" ? 1 : 0,
          });
        }
        return acc;
      },
      [] as {
        name: string;
        count: number;
        positive: number;
        negative: number;
      }[],
    )
    .sort((a, b) => b.count - a.count);

  const totalNegativeForShare = Math.max(1, stats.negative);
  const totalHighForShare = Math.max(1, stats.highPriority);
  const localImpactCategories = categoryData.map((cat) => {
    const highPriorityCount = analyzedFeedback.filter(
      (f) =>
        (f.analysis?.category || "Uncategorized") === cat.name &&
        f.analysis?.priority === "high",
    ).length;
    return {
      category: cat.name,
      total_count: cat.count,
      neg_count: cat.negative,
      pos_count: cat.positive,
      high_priority_count: highPriorityCount,
      neg_share_percent: (cat.negative / totalNegativeForShare) * 100,
      high_priority_share_percent:
        (highPriorityCount / totalHighForShare) * 100,
    };
  });

  const displayImpactCategories =
    impactMetrics?.categories && impactMetrics.categories.length > 0
      ? impactMetrics.categories
      : localImpactCategories;

  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayFeedback = feedback.filter((f) => {
      const fbDate = new Date(f.createdAt);
      return fbDate.toDateString() === date.toDateString();
    });
    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      total: dayFeedback.length,
      positive: dayFeedback.filter((f) => f.analysis?.sentiment === "positive")
        .length,
    };
  });

  const topIssues = analyzedFeedback
    .filter(
      (f) =>
        f.analysis?.sentiment === "negative" && f.analysis?.priority === "high",
    )
    .slice(0, 5);

  const topPraises = analyzedFeedback
    .filter((f) => f.analysis?.sentiment === "positive")
    .slice(0, 5);

  if (isBootstrapping) {
    return (
      <AppLayout title="Insights">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-3 text-muted-foreground">
            <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentProduct) {
    return (
      <AppLayout title="Insights">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">📦</div>
            <h2 className="text-xl font-semibold">No Product Selected</h2>
            <p className="text-muted-foreground">
              Select a product from the sidebar to view insights
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Critical Alert":
        return (
          <Badge
            variant="destructive"
            className="px-2.5 py-0.5 text-sm font-medium"
          >
            Critical Alert
          </Badge>
        );
      case "Action Required":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-0.5 text-sm font-medium">
            Action Required
          </Badge>
        );
      case "Needs Attention":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 px-2.5 py-0.5 text-sm font-medium">
            Needs Attention
          </Badge>
        );
      case "Healthy":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-0.5 text-sm font-medium">
            Healthy
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-sm font-medium"
          >
            Stable
          </Badge>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const normalized = urgency.toLowerCase();
    if (normalized.includes("immediate")) {
      return (
        <Badge variant="destructive" className="text-xs font-medium shrink-0">
          {urgency}
        </Badge>
      );
    }
    if (normalized.includes("soon") || normalized.includes("short-term")) {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-medium shrink-0">
          {urgency}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs font-medium shrink-0">
        {urgency}
      </Badge>
    );
  };

  const periodLabel = formatPeriodLabel(selectedPeriod);

  return (
    <AppLayout
      title="Insights"
      description={`Customer Feedback Intelligence for ${currentProduct.name}`}
    >
      <div className="space-y-6">
        {/* TIME PERIOD SELECTOR */}
        <Card className="p-3 bg-muted/40 border-border/80 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-background border text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  Time Window:
                </span>
                <span className="text-xs font-bold ml-1.5 text-foreground">
                  {periodLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-background/80 p-1 rounded-lg border border-border/60">
              {(
                [
                  ["today", "Today"],
                  ["7d", "Last 7 Days"],
                  ["30d", "Last 30 Days"],
                  ["90d", "Last 90 Days"],
                ] as const
              ).map(([key, label]) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePeriodChange(key)}
                  className="h-7 text-xs px-2.5"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* AI EXECUTIVE BRIEF */}
        <Card className="border-border shadow-sm">
          <CardHeader
            className={cn(
              "transition-[padding] duration-500 ease-out",
              briefOpen ? "pb-2" : "pb-4",
            )}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>

              <div
                className={cn(
                  "min-w-0 flex-1",
                  briefOpen
                    ? "flex flex-col gap-2"
                    : "flex flex-wrap items-center gap-x-2 gap-y-1.5",
                )}
              >
                <CardTitle className="truncate text-lg font-semibold tracking-tight leading-tight sm:text-2xl sm:leading-snug">
                  AI Executive Brief
                </CardTitle>
                <div
                  ref={briefBadgesRef}
                  className="flex flex-row flex-wrap items-center gap-1.5 will-change-transform sm:gap-2"
                >
                  {executiveBrief &&
                    getStatusBadge(
                      executiveBrief.attention_status ||
                        executiveBrief.macro_health_status,
                    )}
                  <Badge
                    variant="outline"
                    className="text-xs font-normal text-muted-foreground sm:text-sm"
                  >
                    {periodLabel}
                  </Badge>
                  {executiveBrief?.is_stale && (
                    <Badge
                      variant="destructive"
                      className="text-xs font-normal sm:text-sm"
                    >
                      Outdated — regenerate
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {executiveBrief && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleDownloadBriefPdf}
                      className="h-8 w-8"
                      aria-label="Download AI brief as PDF"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {briefOpen && (
                      <>
                        <Button
                          variant={
                            executiveBrief.is_stale ? "default" : "outline"
                          }
                          size="icon"
                          onClick={handleRegenerateBrief}
                          disabled={isRefreshingBrief || isBriefLoading}
                          className="h-8 w-8 sm:hidden"
                          aria-label={
                            isRefreshingBrief || isBriefLoading
                              ? "Synthesizing brief"
                              : "Regenerate brief"
                          }
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${isRefreshingBrief || isBriefLoading ? "animate-spin" : ""}`}
                          />
                        </Button>
                        <Button
                          variant={
                            executiveBrief.is_stale ? "default" : "outline"
                          }
                          size="sm"
                          onClick={handleRegenerateBrief}
                          disabled={isRefreshingBrief || isBriefLoading}
                          className="hidden gap-2 sm:inline-flex"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${isRefreshingBrief || isBriefLoading ? "animate-spin" : ""}`}
                          />
                          {isRefreshingBrief || isBriefLoading
                            ? "Synthesizing..."
                            : "Regenerate"}
                        </Button>
                      </>
                    )}
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={toggleBriefOpen}
                  aria-expanded={briefOpen}
                  aria-label={
                    briefOpen
                      ? "Collapse AI executive brief"
                      : "Expand AI executive brief"
                  }
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-muted-foreground transition-transform duration-500 ease-out",
                      briefOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                briefOpen && executiveBrief
                  ? "mt-3 grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                {executiveBrief && (
                  <div className="text-sm text-muted-foreground leading-relaxed sm:pl-12">
                    <p className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-1.5">
                      <span>
                        Generated On:{" "}
                        <span className="text-foreground font-medium">
                          {formatFriendlyDateTime(executiveBrief.generated_at)}
                        </span>
                      </span>
                      {executiveBrief.window_start &&
                        executiveBrief.window_end && (
                          <span>
                            <span className="hidden sm:inline">· </span>
                            Analyzed Dates:{" "}
                            <span className="text-foreground font-medium">
                              {formatFriendlyDate(executiveBrief.window_start)}
                            </span>
                            {" – "}
                            <span className="text-foreground font-medium">
                              {formatFriendlyDate(executiveBrief.window_end)}
                            </span>
                          </span>
                        )}
                      {executiveBrief.is_cached
                        ? " · Stored"
                        : " · Just generated"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
              briefOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <CardContent className="pt-4">
            {isLoading || isBriefLoading ? (
              <div className="space-y-4 py-10">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-base">
                    {isBriefLoading
                      ? `Synthesizing brief for ${periodLabel}...`
                      : `Loading brief for ${periodLabel}...`}
                  </p>
                </div>
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded mx-auto" />
                <div className="h-24 w-full bg-muted animate-pulse rounded" />
              </div>
            ) : executiveBrief ? (
              <div className="space-y-8">
                <section className="space-y-3">
                  <h3 className="text-xl font-semibold leading-snug text-foreground">
                    {executiveBrief.headline}
                  </h3>
                  <p className="text-base leading-7 text-muted-foreground">
                    {executiveBrief.executive_summary}
                  </p>
                  {executiveBrief.data_context && (
                    <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          {executiveBrief.data_context.total_feedback} feedback
                          items analyzed
                        </span>
                        <span>
                          {executiveBrief.data_context.negative} negative
                        </span>
                        <span>
                          {executiveBrief.data_context.high_priority} high
                          priority
                        </span>
                        <span className="capitalize">
                          Evidence:{" "}
                          {executiveBrief.data_context.evidence_strength}
                        </span>
                      </div>
                      <p className="mt-2 leading-6">
                        {executiveBrief.data_context.evidence_note}
                      </p>
                    </div>
                  )}
                </section>

                {executiveBrief.key_findings?.length > 0 && (
                  <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 space-y-4">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <Zap className="h-4 w-4 fill-current shrink-0" />
                      <h3 className="text-base font-semibold">Key findings</h3>
                    </div>
                    <div className="space-y-3">
                      {executiveBrief.key_findings.map((finding, index) => (
                        <article
                          key={`${finding.finding}-${index}`}
                          className="space-y-1"
                        >
                          <p className="text-sm leading-6 text-foreground">
                            {finding.finding}
                          </p>
                          <EvidenceCountLink
                            ids={finding.evidence_feedback_ids}
                            productId={currentProduct?.id}
                            className="text-xs text-muted-foreground"
                          >
                            {finding.full_period_count
                              ? `${finding.evidence_count} matching feedback items in the period`
                              : `${finding.evidence_count} supporting feedback item${finding.evidence_count === 1 ? "" : "s"}`}
                          </EvidenceCountLink>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {executiveBrief.reported_issues &&
                  executiveBrief.reported_issues.length > 0 && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <h3 className="text-base font-semibold text-foreground">
                          Reported customer issues
                        </h3>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {executiveBrief.reported_issues.map((issue, index) => (
                          <article
                            key={`${issue.issue}-${index}`}
                            className="rounded-xl border border-border bg-card p-4 space-y-2"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {issue.topic && (
                                <Badge variant="outline" className="text-xs">
                                  {issue.topic}
                                </Badge>
                              )}

                              {issue.severity && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs capitalize"
                                >
                                  {issue.severity} severity
                                </Badge>
                              )}
                            </div>

                            <p className="font-medium text-sm leading-6">
                              {issue.issue}
                            </p>

                            <EvidenceCountLink
                              ids={issue.evidence_feedback_ids}
                              productId={currentProduct?.id}
                              className="text-xs text-muted-foreground"
                            >
                              Evidence: {issue.evidence_count} supporting
                              feedback{" "}
                              {issue.evidence_count === 1 ? "item" : "items"}
                            </EvidenceCountLink>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-base font-semibold text-foreground">
                      Root-cause hypotheses
                    </h3>
                  </div>
                  {executiveBrief.root_cause_hypotheses?.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {executiveBrief.root_cause_hypotheses.map(
                        (hypothesis, index) => (
                          <article
                            key={`${hypothesis.hypothesis}-${index}`}
                            className="rounded-xl border border-border bg-muted/20 p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="outline" className="capitalize">
                                {hypothesis.confidence} confidence
                              </Badge>
                              <EvidenceCountLink
                                ids={hypothesis.evidence_feedback_ids}
                                productId={currentProduct?.id}
                                className="text-xs text-muted-foreground"
                              >
                                {hypothesis.evidence_feedback_ids.length}{" "}
                                supporting item
                                {hypothesis.evidence_feedback_ids.length === 1
                                  ? ""
                                  : "s"}
                              </EvidenceCountLink>
                            </div>
                            <p className="text-sm leading-6 text-foreground">
                              {hypothesis.hypothesis}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      No sufficiently supported root-cause hypothesis was
                      identified from the available feedback.
                    </p>
                  )}
                </section>

                {executiveBrief.recommended_actions?.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-base font-semibold text-foreground">
                        Recommended actions
                      </h3>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {executiveBrief.recommended_actions.map(
                        (recommendation, index) => (
                          <article
                            key={`${recommendation.title}-${index}`}
                            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {recommendation.rank || index + 1}
                              </span>
                              {getUrgencyBadge(recommendation.urgency)}
                              <Badge variant="outline">
                                {recommendation.area}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-base font-semibold leading-snug text-foreground">
                                {recommendation.title}
                              </h4>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {recommendation.action}
                              </p>
                            </div>
                            <div className="border-t border-border pt-3 space-y-2 text-sm leading-6">
                              <p>
                                <span className="font-semibold text-foreground">
                                  Why:
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  {recommendation.reason}
                                </span>
                              </p>
                              {recommendation.expected_effect && (
                                <p>
                                  <span className="font-semibold text-foreground">
                                    Expected effect:
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    {recommendation.expected_effect}
                                  </span>
                                </p>
                              )}
                              <EvidenceCountLink
                                ids={recommendation.evidence_feedback_ids}
                                productId={currentProduct?.id}
                                className="text-xs text-muted-foreground"
                              >
                                Evidence:{" "}
                                {recommendation.evidence_feedback_ids.length}{" "}
                                feedback item
                                {recommendation.evidence_feedback_ids.length ===
                                1
                                  ? ""
                                  : "s"}
                              </EvidenceCountLink>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                )}

                {executiveBrief.strengths?.length > 0 && (
                  <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <h3 className="text-base font-semibold">
                        Strengths to keep
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {executiveBrief.strengths.map((strength, index) => (
                        <li
                          key={`${strength.strength}-${index}`}
                          className="text-sm leading-6 text-foreground"
                        >
                          <span>{strength.strength}</span>
                          <EvidenceCountLink
                            ids={strength.evidence_feedback_ids}
                            productId={currentProduct?.id}
                            className="ml-2 text-xs text-muted-foreground"
                          >
                            {strength.evidence_count} supporting feedback item
                            {strength.evidence_count === 1 ? "" : "s"}
                          </EvidenceCountLink>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center py-10 space-y-4">
                <p className="text-base text-foreground font-medium">
                  No AI brief for {periodLabel.toLowerCase()}
                </p>
                <p className="text-sm leading-6 text-muted-foreground max-w-md mx-auto">
                  Generate AI Executive Brief for this period.
                </p>
                {generateError && (
                  <p className="text-sm text-destructive">{generateError}</p>
                )}
                <Button
                  onClick={() => handleGenerateBrief(false)}
                  disabled={isBriefLoading}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Brief
                </Button>
              </div>
            )}
              </CardContent>
            </div>
          </div>
        </Card>

        {/* Live metrics + charts for selected period */}
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  {isLoading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded mx-auto mb-1" />
                  ) : (
                    <p className="text-3xl font-bold">{stats.total}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Period Feedback
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                Number(sentimentScore) >= 0
                  ? "border-success/30 bg-success/5"
                  : "border-destructive/30 bg-destructive/5"
              }
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {Number(sentimentScore) >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    <p
                      className={`text-3xl font-bold ${Number(sentimentScore) >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {sentimentScore}%
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Period Sentiment
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-warning">★</span>
                    <p className="text-3xl font-bold">
                      {stats.avgRating.toFixed(1)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">
                    {stats.positive}
                  </p>
                  <p className="text-sm text-muted-foreground">Positive</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={
                stats.highPriority > 0
                  ? "border-destructive/30 bg-destructive/5"
                  : ""
              }
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {stats.highPriority > 0 && (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    <p
                      className={`text-3xl font-bold ${stats.highPriority > 0 ? "text-destructive" : ""}`}
                    >
                      {stats.highPriority}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sentiment Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.analyzed === 0 ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No data for this period
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentData.filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {sentimentData
                              .filter((d) => d.value > 0)
                              .map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 mt-2 flex-wrap">
                      {sentimentData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted-foreground">
                            {item.name}
                          </span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Priority Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.analyzed === 0 ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No data for this period
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={priorityData.filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {priorityData
                              .filter((d) => d.value > 0)
                              .map((entry, index) => (
                                <Cell
                                  key={`pcell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 mt-2">
                      {priorityData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-muted-foreground">
                            {item.name}
                          </span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Activity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.every((d) => d.total === 0) ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No data for this period
                    </p>
                  </div>
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis hide />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.2)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Category Volume Distribution
                </CardTitle>
                <CardDescription>
                  Mentions across categories ({periodLabel})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No categorized feedback in this period
                    </p>
                  ) : (
                    categoryData.map((cat, index) => (
                      <div key={`${cat.name}-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-success flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> {cat.positive}
                            </span>
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <ThumbsDown className="h-3 w-3" /> {cat.negative}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {cat.count} total
                            </Badge>
                          </div>
                        </div>
                        <Progress
                          value={
                            stats.analyzed > 0
                              ? (cat.count / stats.analyzed) * 100
                              : 0
                          }
                          className="h-2"
                        />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-base">
                    Negative Signal Concentration
                  </CardTitle>
                </div>
                <CardDescription>
                  Where negative and high-priority feedback is concentrated (
                  {periodLabel})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {displayImpactCategories.length > 0 ? (
                  <div className="space-y-4">
                    {displayImpactCategories.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">
                              {item.category}
                            </span>
                            {idx === 0 && item.neg_count > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Leading negative category
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {item.total_count} mentions
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Share of Negative Feedback:
                            </span>
                            <span className="font-bold text-destructive">
                              {item.neg_share_percent.toFixed(1)}% (
                              {item.neg_count})
                            </span>
                          </div>
                          <Progress
                            value={item.neg_share_percent}
                            className="h-1.5 bg-muted"
                          />
                          <div className="flex justify-between text-xs pt-1">
                            <span className="text-muted-foreground">
                              Share of High-Priority:
                            </span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {item.high_priority_share_percent.toFixed(1)}% (
                              {item.high_priority_count})
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No negative category signals in this period.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {!isLoading && (topIssues.length > 0 || topPraises.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {topIssues.length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-base">
                        Top Critical Feedback ({periodLabel})
                      </CardTitle>
                    </div>
                    <CardDescription>
                      High-priority negatives in this timeframe
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topIssues.map((fb, index) => (
                        <div
                          key={fb.id}
                          className="flex gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20"
                        >
                          <span className="text-lg font-bold text-destructive">
                            #{index + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            {fb.analysis?.summary ? (
                              <p className="text-sm text-muted-foreground italic">
                                {fb.analysis.summary}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {fb.text}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {fb.analysis?.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatFriendlyDate(fb.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {topPraises.length > 0 && (
                <Card className="border-emerald-500/30">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <CardTitle className="text-base">
                        Top Positive Reviews ({periodLabel})
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Good feedback worth reinforcing in this timeframe
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topPraises.map((fb, index) => (
                        <div
                          key={fb.id}
                          className="flex gap-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                        >
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            #{index + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            {fb.analysis?.summary ? (
                              <p className="text-sm text-muted-foreground italic">
                                {fb.analysis.summary}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {fb.text}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {fb.analysis?.category}
                              </Badge>
                              {fb.rating != null && fb.rating > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ★ {fb.rating}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatFriendlyDate(fb.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      </div>
    </AppLayout>
  );
}

export default function Insights() {
  return (
    <Suspense
      fallback={
        <AppLayout title="Insights">
          <div className="flex h-[40vh] items-center justify-center text-sm text-muted-foreground">
            Loading insights…
          </div>
        </AppLayout>
      }
    >
      <InsightsContent />
    </Suspense>
  );
}

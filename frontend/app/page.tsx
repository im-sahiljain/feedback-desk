"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Feedback,
  ExecutiveBrief,
  ImpactCorrelationMetrics,
} from "@/types";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Sparkles,
  ArrowRight,
  Clock,
  Activity,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { normalizeBackendFeedbacks } from "@/lib/normalization";
import { formatFriendlyDateTime } from "@/lib/dates";
import { api } from "@/lib/api";

type PeriodType = "today" | "7d" | "30d" | "90d";

const DASHBOARD_BRIEF_PERIOD = "7d" as const;

const PERIODS: { key: PeriodType; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
];

function periodLabel(period: PeriodType): string {
  return PERIODS.find((p) => p.key === period)?.label ?? period;
}

function StatusBadge({ status }: { status?: string }) {
  const base =
    "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium leading-none";

  switch (status) {
    case "Critical Alert":
      return (
        <Badge variant="destructive" className={base}>
          Critical
        </Badge>
      );
    case "Action Required":
      return (
        <Badge
          className={`${base} border border-amber-500/25 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300`}
        >
          Action required
        </Badge>
      );
    case "Healthy":
      return (
        <Badge
          className={`${base} border border-emerald-500/25 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300`}
        >
          Healthy
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={base}>
          Stable
        </Badge>
      );
  }
}

function SentimentIcon({ sentiment }: { sentiment?: string }) {
  if (sentiment === "positive")
    return <ThumbsUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  if (sentiment === "negative")
    return <ThumbsDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function Dashboard() {
  const { currentProduct, isBootstrapping } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("today");
  const [executiveBrief, setExecutiveBrief] = useState<ExecutiveBrief | null>(
    null,
  );
  const [impactMetrics, setImpactMetrics] =
    useState<ImpactCorrelationMetrics | null>(null);

  const loadDashboardData = useCallback(
    (productId: string, period: PeriodType) => {
      setIsLoading(true);

      Promise.all([
        api.feedbacks.list(productId, period),
        api.analytics.getExecutiveBrief(
          productId,
          false,
          DASHBOARD_BRIEF_PERIOD,
          undefined,
          undefined,
          true,
        ),
      ])
        .then(([feedbackData, briefData]) => {
          setFeedback(normalizeBackendFeedbacks(feedbackData, productId));
          setExecutiveBrief(briefData?.brief ?? null);
          setImpactMetrics(briefData?.metrics ?? null);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (currentProduct) {
      loadDashboardData(currentProduct.id, selectedPeriod);
    }
  }, [currentProduct, selectedPeriod, loadDashboardData]);

  if (isBootstrapping) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="space-y-3 text-center text-muted-foreground">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Loading…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!currentProduct) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="max-w-sm space-y-2 text-center">
            <h2 className="text-lg font-semibold">No product selected</h2>
            <p className="text-sm text-muted-foreground">
              Choose a product from the sidebar to see live metrics.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/products">Go to Products</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const total = feedback.length;
  const analyzed = feedback.filter((f) => f.analysis);
  const positiveCount = analyzed.filter(
    (f) => f.analysis?.sentiment === "positive",
  ).length;
  const negativeCount = analyzed.filter(
    (f) => f.analysis?.sentiment === "negative",
  ).length;
  const neutralCount = analyzed.filter(
    (f) => f.analysis?.sentiment === "neutral",
  ).length;
  const highPriorityCount = analyzed.filter(
    (f) => f.analysis?.priority === "high",
  ).length;

  const ratedItems = feedback.filter((f) => f.rating && f.rating > 0);
  const avgRating =
    ratedItems.length > 0
      ? ratedItems.reduce((acc, f) => acc + (f.rating || 0), 0) /
        ratedItems.length
      : 0;

  const netSentimentScore =
    total > 0 ? Math.round(((positiveCount - negativeCount) / total) * 100) : 0;

  const promotersCount = ratedItems.filter((f) => (f.rating || 0) >= 4).length;
  const passivesCount = ratedItems.filter((f) => (f.rating || 0) === 3).length;
  const detractorsCount = ratedItems.filter(
    (f) => (f.rating || 0) <= 2 && (f.rating || 0) > 0,
  ).length;
  const ratedTotal = ratedItems.length || 1;
  const promoterPct = Math.round((promotersCount / ratedTotal) * 100);
  const passivePct = Math.round((passivesCount / ratedTotal) * 100);
  const detractorPct = Math.round((detractorsCount / ratedTotal) * 100);

  const sentimentData = [
    { name: "Positive", value: positiveCount, color: "hsl(var(--success))" },
    { name: "Neutral", value: neutralCount, color: "hsl(var(--warning))" },
    { name: "Negative", value: negativeCount, color: "hsl(var(--destructive))" },
  ];

  const categoryMap: Record<
    string,
    { count: number; negative: number; positive: number }
  > = {};
  feedback.forEach((f) => {
    const cats =
      f.categories && f.categories.length > 0
        ? f.categories
        : [f.category || "General"];
    cats.forEach((c) => {
      if (!categoryMap[c]) categoryMap[c] = { count: 0, negative: 0, positive: 0 };
      categoryMap[c].count++;
      if (f.analysis?.sentiment === "negative") categoryMap[c].negative++;
      if (f.analysis?.sentiment === "positive") categoryMap[c].positive++;
    });
  });

  const categoryBarData = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      negative: data.negative,
      positive: data.positive,
    }))
    .sort((a, b) => b.negative + b.positive - (a.negative + a.positive))
    .slice(0, 6);

  const recentFeedback = [...feedback]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const pulseText =
    impactMetrics?.quantified_impact_statement || executiveBrief?.headline;
  const primaryAction = executiveBrief?.top_strategic_decisions?.[0]?.decision;

  return (
    <AppLayout
      title="Dashboard"
      description={`${currentProduct.name} · ${periodLabel(selectedPeriod)}`}
    >
      <div className="space-y-6">
        {/* Period filter */}
        <Card className="border-border/80 bg-muted/40 p-3 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <div className="rounded-md border bg-background p-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Time window
                </span>
                <span className="ml-1.5 text-xs font-semibold text-foreground">
                  {periodLabel(selectedPeriod)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 p-1">
              {PERIODS.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedPeriod(key)}
                  className="h-7 px-2.5 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* AI pulse / CTA */}
        {executiveBrief && pulseText ? (
          <Card className="border-border shadow-sm">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="mt-0.5 shrink-0 self-start rounded-lg bg-primary/10 p-2 text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex min-h-5 flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold leading-5">
                      7-day operational pulse
                    </span>
                    <StatusBadge status={executiveBrief.macro_health_status} />
                    {executiveBrief.generated_at && (
                      <span className="text-xs leading-5 text-muted-foreground">
                        {formatFriendlyDateTime(executiveBrief.generated_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {pulseText}
                  </p>
                  {primaryAction && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Next step:
                      </span>{" "}
                      {primaryAction}
                    </p>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Link href="/insights">
                  Open Insights
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-border/80 bg-muted/20 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">No AI brief stored yet</p>
                  <p className="text-xs text-muted-foreground">
                    Generate a 7-day executive brief in Insights to surface
                    priorities here.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0 gap-1.5">
                <Link href="/insights">
                  Generate brief
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-3xl font-bold tabular-nums">{total}</p>
              <p className="mt-1 text-sm text-muted-foreground">Feedback</p>
            </CardContent>
          </Card>
          <Card
            className={
              netSentimentScore >= 0
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5"
            }
          >
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {netSentimentScore >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    netSentimentScore >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {netSentimentScore > 0 ? `+${netSentimentScore}` : netSentimentScore}%
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Sentiment</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-3xl font-bold tabular-nums">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Avg rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <p className="text-3xl font-bold tabular-nums text-success">
                {positiveCount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Positive</p>
            </CardContent>
          </Card>
          <Card
            className={
              highPriorityCount > 0
                ? "border-destructive/30 bg-destructive/5"
                : ""
            }
          >
            <CardContent className="pt-5 pb-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {highPriorityCount > 0 && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
                <p
                  className={`text-3xl font-bold tabular-nums ${
                    highPriorityCount > 0 ? "text-destructive" : ""
                  }`}
                >
                  {highPriorityCount}
                </p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Customer rating funnel */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">
                    Customer rating funnel
                  </CardTitle>
                </div>
                <CardDescription>
                  Breakdown by rating tier in this time window
                </CardDescription>
              </div>
              <Badge variant="outline" className="self-start text-xs sm:self-auto">
                {ratedItems.length} rated · {total} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Happy (4–5★)
                  </span>
                  <Badge className="bg-emerald-600 text-white text-xs">
                    {promoterPct}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {promotersCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    customers
                  </span>
                </p>
                <Progress
                  value={promoterPct}
                  className="h-2 bg-emerald-500/20"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Strong advocates — good candidates for reviews and referrals.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    Neutral (3★)
                  </span>
                  <Badge className="bg-amber-600 text-white text-xs">
                    {passivePct}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {passivesCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    customers
                  </span>
                </p>
                <Progress value={passivePct} className="h-2 bg-amber-500/20" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Mostly satisfied, with friction worth addressing before it
                  turns negative.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Unhappy (1–2★)
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {detractorPct}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {detractorsCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    customers
                  </span>
                </p>
                <Progress value={detractorPct} className="h-2 bg-rose-500/20" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Needs direct follow-up to recover trust and stop churn risk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sentiment</CardTitle>
              <CardDescription>
                {analyzed.length} analyzed in this window
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyzed.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No analyzed feedback yet
                </div>
              ) : (
                <>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentData.filter((d) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {sentimentData
                            .filter((d) => d.value > 0)
                            .map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
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
                  <div className="mt-1 flex flex-wrap justify-center gap-3">
                    {sentimentData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                        <span className="font-medium tabular-nums">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Topics</CardTitle>
              <CardDescription>
                Positive vs negative volume by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBarData.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                  No categorized feedback yet
                </div>
              ) : (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryBarData}
                        layout="vertical"
                        margin={{ left: 8, right: 12, top: 4, bottom: 0 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="negative"
                          name="Negative"
                          fill="hsl(var(--destructive))"
                          stackId="a"
                        />
                        <Bar
                          dataKey="positive"
                          name="Positive"
                          fill="hsl(var(--success))"
                          stackId="a"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-destructive" />
                      Negative
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm bg-success" />
                      Positive
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent feedback */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent feedback</CardTitle>
                <CardDescription>
                  Latest items in this time window
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/feedback">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-lg border bg-muted/40 p-4 animate-pulse"
                  >
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : recentFeedback.length === 0 ? (
              <div className="space-y-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No feedback in this window yet.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/products">Share collection link</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {recentFeedback.map((fb) => (
                  <li
                    key={fb.id}
                    className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <SentimentIcon sentiment={fb.analysis?.sentiment} />
                        {fb.rating != null && fb.rating > 0 && (
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            {fb.rating}/5
                          </span>
                        )}
                        {fb.analysis?.priority === "high" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            High
                          </Badge>
                        )}
                        {fb.analysis?.category && (
                          <span className="text-xs text-muted-foreground">
                            {fb.analysis.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground line-clamp-2">
                        {fb.text}
                      </p>
                      {(fb.analysis?.summary || fb.analysis?.rootCause) && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {fb.analysis.summary || fb.analysis.rootCause}
                        </p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatFriendlyDateTime(fb.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

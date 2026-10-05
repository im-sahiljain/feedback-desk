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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  INDUSTRY_ICONS,
  INDUSTRY_LABELS,
  Feedback,
  Priority,
  ExecutiveBrief,
  ImpactCorrelationMetrics,
} from "@/types";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Star,
  Sparkles,
  Zap,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Users,
  CheckCircle2,
  ExternalLink,
  Activity,
  Layers,
  ChevronRight,
  RefreshCw,
  Calendar,
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
  AreaChart,
  Area,
} from "recharts";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

type PeriodType = "7d" | "30d" | "90d" | "all";

export default function Dashboard() {
  const { currentProduct } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("all");
  const [executiveBrief, setExecutiveBrief] = useState<ExecutiveBrief | null>(
    null,
  );
  const [impactMetrics, setImpactMetrics] =
    useState<ImpactCorrelationMetrics | null>(null);

  // Load period-specific data for Dashboard
  const loadDashboardData = useCallback(
    (productId: string, period: PeriodType) => {
      setIsLoading(true);

      Promise.all([
        api.feedbacks.list(productId, period),
        api.analytics.getExecutiveBrief(productId, false, period),
      ])
        .then(([feedbackData, briefData]) => {
          const mappedFeedback = (
            Array.isArray(feedbackData) ? feedbackData : []
          ).map((f: any) => {
            const priorityLabel =
              f.priority_label ||
              (typeof f.priority === "string"
                ? f.priority
                : f.priority?.label) ||
              f.raw_ai_metadata?.priority?.label ||
              "";
            let priorityValue: Priority = "medium";
            if (priorityLabel.toLowerCase().includes("high"))
              priorityValue = "high";
            else if (priorityLabel.toLowerCase().includes("low"))
              priorityValue = "low";

            const categoryName =
              f.category_name ||
              (typeof f.category === "string"
                ? f.category
                : f.category?.label) ||
              f.raw_ai_metadata?.category?.label ||
              "General";
            const sentimentLabel =
              f.sentiment_label ||
              (typeof f.sentiment === "string"
                ? f.sentiment
                : f.sentiment?.label) ||
              f.raw_ai_metadata?.sentiment?.label ||
              "neutral";

            const categoriesArr =
              Array.isArray(f.categories) && f.categories.length > 0
                ? f.categories
                : [categoryName];

            const actionItems =
              Array.isArray(f.raw_ai_metadata?.action_items) &&
              f.raw_ai_metadata.action_items.length > 0
                ? f.raw_ai_metadata.action_items
                : [];

            return {
              id: String(f.id ?? ""),
              productId: productId,
              text: f.feedback || "",
              rating: f.rating ? Number(f.rating) : 0,
              email: f.email,
              createdAt: new Date(f.created_at || Date.now()),
              categories: categoriesArr,
              category: categoryName,
              sentiment: sentimentLabel.toLowerCase(),
              analysis: {
                sentiment: sentimentLabel.toLowerCase(),
                category: categoryName,
                categories: categoriesArr,
                priority: priorityValue,
                summary:
                  f.raw_ai_metadata?.summary ||
                  (f.feedback ? f.feedback.substring(0, 70) + "..." : ""),
                rootCause: f.raw_ai_metadata?.root_cause,
                actionItems: actionItems,
              },
              isAnalyzing: f.status === "Pending",
            };
          });
          setFeedback(mappedFeedback);

          if (briefData && briefData.brief) {
            setExecutiveBrief(briefData.brief);
          }
          if (briefData && briefData.metrics) {
            setImpactMetrics(briefData.metrics);
          }
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

  const productFeedback = feedback;

  // Mathematical Business Metrics Calculations
  const total = productFeedback.length;
  const analyzed = productFeedback.filter((f) => f.analysis);
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

  const ratedItems = productFeedback.filter((f) => f.rating && f.rating > 0);
  const avgRating =
    ratedItems.length > 0
      ? ratedItems.reduce((acc, f) => acc + (f.rating || 0), 0) /
        ratedItems.length
      : 0;

  // Net Sentiment Score (NSS): % Positive - % Negative (-100 to +100)
  const netSentimentScore =
    total > 0 ? Math.round(((positiveCount - negativeCount) / total) * 100) : 0;

  // Customer Reputation Funnel Segments
  const promotersCount =
    ratedItems.filter((f) => (f.rating || 0) >= 4).length || positiveCount;
  const passivesCount =
    ratedItems.filter((f) => (f.rating || 0) === 3).length || neutralCount;
  const detractorsCount =
    ratedItems.filter((f) => (f.rating || 0) <= 2 && (f.rating || 0) > 0)
      .length || negativeCount;

  const promoterPct =
    total > 0 ? Math.round((promotersCount / total) * 100) : 0;
  const passivePct = total > 0 ? Math.round((passivesCount / total) * 100) : 0;
  const detractorPct =
    total > 0 ? Math.round((detractorsCount / total) * 100) : 0;

  // Chart Data
  const sentimentData = [
    { name: "Positive", value: positiveCount, color: "hsl(var(--success))" },
    { name: "Neutral", value: neutralCount, color: "hsl(var(--warning))" },
    {
      name: "Negative",
      value: negativeCount,
      color: "hsl(var(--destructive))",
    },
  ];

  // Category unnested distribution
  const categoryMap: Record<
    string,
    { count: number; negative: number; positive: number }
  > = {};
  productFeedback.forEach((f) => {
    const cats =
      f.categories && f.categories.length > 0
        ? f.categories
        : [f.category || "General"];
    cats.forEach((c) => {
      if (!categoryMap[c]) {
        categoryMap[c] = { count: 0, negative: 0, positive: 0 };
      }
      categoryMap[c].count++;
      if (f.analysis?.sentiment === "negative") categoryMap[c].negative++;
      if (f.analysis?.sentiment === "positive") categoryMap[c].positive++;
    });
  });

  const categoryBarData = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      total: data.count,
      negative: data.negative,
      positive: data.positive,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const recentFeedback = productFeedback.slice(0, 4);

  if (!currentProduct) {
    return (
      <AppLayout title="Dashboard Overview">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">📦</div>
            <h2 className="text-xl font-semibold">No Product Selected</h2>
            <p className="text-muted-foreground">
              Select an organization or product from the sidebar to view
              analytics
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Critical Alert":
        return (
          <Badge
            variant="destructive"
            className="animate-pulse px-2.5 py-0.5 text-xs font-semibold"
          >
            🚨 Critical Alert
          </Badge>
        );
      case "Action Required":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-0.5 text-xs font-semibold">
            ⚠️ Action Required
          </Badge>
        );
      case "Healthy":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-0.5 text-xs font-semibold">
            ✅ Operationally Healthy
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-xs font-semibold"
          >
            📊 Operationally Stable
          </Badge>
        );
    }
  };

  return (
    <AppLayout
      title="Dashboard Overview"
      description={`Live customer feedback and metrics for ${currentProduct.name}`}
    >
      <div className="space-y-6">
        {/* ============================================================== */}
        {/* COMMAND CENTER HEADER & TIME-WINDOW FILTER                     */}
        {/* ============================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-4xl p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              {INDUSTRY_ICONS[currentProduct.industry] || "🏢"}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight">
                  {currentProduct.name}
                </h1>
                <Badge variant="outline" className="text-xs">
                  {INDUSTRY_LABELS[currentProduct.industry] ||
                    currentProduct.industry}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {currentProduct.description ||
                  "Continuous customer feedback intelligence and operational decision support."}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CURRENT STATUS PULSE BANNER (READ-ONLY)                        */}
        {/* ============================================================== */}
        {executiveBrief ? (
          <Card
            className={`shadow-sm overflow-hidden border ${
              executiveBrief.macro_health_status === "Critical Alert"
                ? "border-destructive/30 bg-destructive/5"
                : executiveBrief.macro_health_status === "Action Required"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
            }`}
          >
            <CardContent className="p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4 w-full">
                <div
                  className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                    executiveBrief.macro_health_status === "Critical Alert"
                      ? "bg-destructive/10 text-destructive"
                      : executiveBrief.macro_health_status === "Action Required"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <Activity className="h-5 w-5" />
                </div>
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Current Operational Pulse
                    </span>
                    {getStatusBadge(executiveBrief.macro_health_status)}
                    {executiveBrief.generated_at && (
                      <span className="text-[11px] text-muted-foreground font-normal">
                        • Generated on{" "}
                        {new Date(executiveBrief.generated_at).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                    {impactMetrics?.quantified_impact_statement ||
                      executiveBrief.headline}
                  </p>
                  {executiveBrief.top_strategic_decisions?.[0] && (
                    <div className="text-xs sm:text-sm text-muted-foreground pt-3.5 mt-3 border-t border-border/40 leading-relaxed space-y-1">
                      <strong className="text-foreground font-semibold block sm:inline-block sm:mr-1">
                        Primary Action Item:
                      </strong>
                      <span className="inline leading-relaxed">
                        {executiveBrief.top_strategic_decisions[0].decision}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 bg-muted/20 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  Strategic Operational Brief
                </p>
                <p className="text-xs text-muted-foreground">
                  Visit Insights from the sidebar menu to run deep AI synthesis,
                  impact correlations, and strategic decision planning.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================== */}
        {/* EXECUTIVE KPI COMMAND CENTER (NORTH STAR BUSINESS METRICS)     */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Net Sentiment */}
          <Card
            className={
              netSentimentScore >= 0
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-rose-500/30 bg-rose-500/5"
            }
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Overall Sentiment
                </span>
                {netSentimentScore >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p
                  className={`text-3xl font-extrabold ${netSentimentScore >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                  {netSentimentScore > 0
                    ? `+${netSentimentScore}%`
                    : `${netSentimentScore}%`}
                </p>
                <span className="text-xs text-muted-foreground font-medium">
                  {netSentimentScore >= 20
                    ? "Optimal"
                    : netSentimentScore >= 0
                      ? "Stable"
                      : "Needs Attention"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {positiveCount} positive vs {negativeCount} negative reviews
              </p>
            </CardContent>
          </Card>

          {/* KPI 2: Customer Rating */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Average Rating
                </span>
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-extrabold">
                  {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
                </p>
                <span className="text-xs text-muted-foreground font-medium">
                  / 5.0
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(avgRating)
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
                <span className="text-[11px] text-muted-foreground ml-1.5">
                  ({ratedItems.length} ratings)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: High Priority Issues */}
          <Card
            className={
              highPriorityCount > 0
                ? "border-destructive/30 bg-destructive/5"
                : ""
            }
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  High Priority Issues
                </span>
                <ShieldAlert className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p
                  className={`text-3xl font-extrabold ${highPriorityCount > 0 ? "text-destructive" : ""}`}
                >
                  {highPriorityCount}
                </p>
                <span className="text-xs text-muted-foreground font-medium">
                  {total > 0
                    ? `${Math.round((highPriorityCount / total) * 100)}% of total`
                    : "0%"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                High priority items needing immediate follow-up
              </p>
            </CardContent>
          </Card>

          {/* KPI 4: Total Feedback */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Feedback
                </span>
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-extrabold">{total}</p>
                <span className="text-xs text-muted-foreground font-medium">
                  across all channels
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                100% analyzed with AI
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* CUSTOMER REPUTATION & SERVICE RECOVERY FUNNEL                  */}
        {/* ============================================================== */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold">
                    Customer Rating Breakdown
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Breakdown of customer feedback by rating category and
                  sentiment
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="self-start sm:self-auto text-xs"
              >
                {total} Reviews Processed
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Funnel Stage 1: Happy Customers */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🌟</span>
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      Happy Customers (4-5 Stars)
                    </span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs font-bold">
                    {promoterPct}%
                  </Badge>
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {promotersCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    customers
                  </span>
                </p>
                <Progress
                  value={promoterPct}
                  className="h-2 bg-emerald-500/20"
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Recommended Action:</strong> Great candidates for
                  public 5-star reviews.
                </p>
              </div>

              {/* Funnel Stage 2: Neutral Customers */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⚖️</span>
                    <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
                      Neutral Customers (3 Stars)
                    </span>
                  </div>
                  <Badge className="bg-amber-600 text-white text-xs font-bold">
                    {passivePct}%
                  </Badge>
                </div>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {passivesCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    customers
                  </span>
                </p>
                <Progress value={passivePct} className="h-2 bg-amber-500/20" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Recommended Action:</strong> Satisfied overall, but
                  reported minor issues.
                </p>
              </div>

              {/* Funnel Stage 3: Unhappy Customers */}
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🚨</span>
                    <span className="font-bold text-sm text-rose-700 dark:text-rose-300">
                      Unhappy Customers (1-2 Stars)
                    </span>
                  </div>
                  <Badge variant="destructive" className="text-xs font-bold">
                    {detractorPct}%
                  </Badge>
                </div>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {detractorsCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    unhappy customers
                  </span>
                </p>
                <Progress value={detractorPct} className="h-2 bg-rose-500/20" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Recommended Action:</strong> Requires direct team
                  follow-up to resolve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============================================================== */}
        {/* ADVANCED VISUAL ANALYTICS ROW                                  */}
        {/* ============================================================== */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sentiment Health Donut Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Sentiment Breakdown
                  </CardTitle>
                  <CardDescription>
                    Ratio of positive, neutral, and negative customer feedback
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {analyzed.length} analyzed
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {total === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  No feedback data available for this timeframe
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData
                          .filter((d) => d.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <div className="flex justify-center gap-6 -mt-2">
                    {sentimentData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">
                          {item.name}:
                        </span>
                        <span className="font-bold">{item.value}</span>
                        <span className="text-muted-foreground">
                          (
                          {total > 0
                            ? Math.round((item.value / total) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback by Category Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Feedback by Category
                  </CardTitle>
                  <CardDescription>
                    Negative complaints vs positive praise by category
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  By Topic
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {categoryBarData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  No categorized feedback available
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryBarData}
                      layout="vertical"
                      margin={{ left: 20, right: 20, top: 10, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={95}
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
                        name="Negative Issues"
                        fill="hsl(var(--destructive))"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="positive"
                        name="Positive Praise"
                        fill="hsl(var(--success))"
                        stackId="a"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                      Negative Issues
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-success" />
                      Positive Praise
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* LIVE RECENT FEEDBACK                                           */}
        {/* ============================================================== */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Recent Customer Feedback
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest feedback with key insights and recommended actions
                </CardDescription>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs gap-1"
              >
                <Link href="/feedback">
                  View All Feedbacks ({total})
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border bg-muted/40 animate-pulse space-y-2"
                  >
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-3/4 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : recentFeedback.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <p className="text-sm">
                  No feedback submitted for this timeframe yet.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/products">Get Shareable Link / QR Code</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFeedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Rating Badge */}
                        {fb.rating && fb.rating > 0 ? (
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold ${
                              fb.rating <= 2
                                ? "border-destructive text-destructive bg-destructive/5"
                                : fb.rating >= 4
                                  ? "border-emerald-500 text-emerald-600 bg-emerald-500/5"
                                  : "border-amber-500 text-amber-600 bg-amber-500/5"
                            }`}
                          >
                            ⭐ {fb.rating} / 5
                          </Badge>
                        ) : null}

                        {/* Priority Badge */}
                        <Badge
                          variant={
                            fb.analysis?.priority === "high"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {fb.analysis?.priority === "high"
                            ? "⚡ High Priority"
                            : `${fb.analysis?.priority} Priority`}
                        </Badge>

                        {/* Sentiment Icon Badge */}
                        {fb.analysis?.sentiment === "positive" && (
                          <Badge className="bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 text-xs">
                            <ThumbsUp className="h-3 w-3 mr-1" /> Positive
                          </Badge>
                        )}
                        {fb.analysis?.sentiment === "negative" && (
                          <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                            <ThumbsDown className="h-3 w-3 mr-1" /> Negative
                          </Badge>
                        )}
                        {fb.analysis?.sentiment === "neutral" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs">
                            <Minus className="h-3 w-3 mr-1" /> Neutral
                          </Badge>
                        )}

                        {/* Multi-category Pills */}
                        {fb.categories &&
                          fb.categories.map((c, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              🏷️ {c}
                            </Badge>
                          ))}
                      </div>

                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(fb.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Feedback Text */}
                    <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                      "{fb.text}"
                    </p>

                    {/* AI Diagnostics: Root Cause & Action Items */}
                    <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      {fb.analysis?.rootCause ? (
                        <p className="text-muted-foreground line-clamp-1">
                          <strong className="text-foreground">
                            Root Cause:
                          </strong>{" "}
                          {fb.analysis.rootCause}
                        </p>
                      ) : fb.analysis?.summary ? (
                        <p className="text-muted-foreground line-clamp-1 italic">
                          Summary: {fb.analysis.summary}
                        </p>
                      ) : (
                        <div />
                      )}

                      {fb.analysis?.actionItems &&
                        fb.analysis.actionItems.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-primary font-medium shrink-0">
                            <CheckCircle2 className="h-3 w-3" />
                            {fb.analysis.actionItems[0]}
                          </span>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
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
  Minus,
  BarChart3,
  Star,
  Sparkles,
  RefreshCw,
  Target,
  ShieldAlert,
  Lightbulb,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  Zap,
  Calendar,
  Clock,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Feedback,
  Priority,
  ExecutiveBrief,
  ImpactCorrelationMetrics,
} from "@/types";
import { api } from "@/lib/api";

type PeriodType = "7d" | "30d" | "90d" | "all" | "custom";

export default function Insights() {
  const { currentProduct } = useApp();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Time Period State
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);

  // Executive Brief & Macro Decision State
  const [executiveBrief, setExecutiveBrief] = useState<ExecutiveBrief | null>(
    null,
  );
  const [impactMetrics, setImpactMetrics] =
    useState<ImpactCorrelationMetrics | null>(null);
  const [isBriefLoading, setIsBriefLoading] = useState(false);
  const [isRefreshingBrief, setIsRefreshingBrief] = useState(false);

  // Load all insights data for the selected period
  const loadPeriodData = useCallback(
    (
      productId: string,
      period: PeriodType,
      start?: string,
      end?: string,
      forceRefreshBrief = false,
    ) => {
      setIsLoading(true);
      if (forceRefreshBrief) {
        setIsRefreshingBrief(true);
      } else {
        setIsBriefLoading(true);
      }

      // 1. Fetch filtered feedback list
      api.feedbacks
        .list(productId, period, start, end)
        .then((data: any) => {
          const mappedFeedback = (Array.isArray(data) ? data : []).map(
            (f: any) => {
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
                "Uncategorized";
              const sentimentLabel =
                f.sentiment_label ||
                (typeof f.sentiment === "string"
                  ? f.sentiment
                  : f.sentiment?.label) ||
                f.raw_ai_metadata?.sentiment?.label ||
                "neutral";

              return {
                id: String(f.id ?? ""),
                productId: productId,
                text: f.feedback || "",
                rating: f.rating ? Number(f.rating) : 0,
                email: f.email,
                createdAt: new Date(f.created_at || Date.now()),
                sentiment: sentimentLabel.toLowerCase(),
                category: categoryName,
                impact: f.impact || "medium",
                status: f.status || "new",
                analysis: {
                  sentiment: sentimentLabel.toLowerCase(),
                  category: categoryName,
                  priority: priorityValue,
                  summary: f.feedback
                    ? f.feedback.length > 50
                      ? f.feedback.substring(0, 50) + "..."
                      : f.feedback
                    : "",
                },
                isAnalyzing: f.status === "Pending",
              };
            },
          );
          setFeedback(mappedFeedback);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));

      // 2. Fetch Executive Brief & Impact Correlation for this period
      api.analytics
        .getExecutiveBrief(productId, forceRefreshBrief, period, start, end)
        .then((res: any) => {
          if (res && res.brief) {
            setExecutiveBrief(res.brief);
          }
          if (res && res.metrics) {
            setImpactMetrics(res.metrics);
          }
        })
        .catch(console.error)
        .finally(() => {
          setIsBriefLoading(false);
          setIsRefreshingBrief(false);
        });
    },
    [],
  );

  // Fetch when product changes or period changes
  useEffect(() => {
    if (currentProduct) {
      if (selectedPeriod === "custom") {
        if (customStart && customEnd) {
          loadPeriodData(
            currentProduct.id,
            "custom",
            customStart,
            customEnd,
            false,
          );
        }
      } else {
        loadPeriodData(
          currentProduct.id,
          selectedPeriod,
          undefined,
          undefined,
          false,
        );
      }
    }
  }, [currentProduct, selectedPeriod, loadPeriodData]);

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
    if (period === "custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
  };

  const handleApplyCustomRange = () => {
    if (currentProduct && customStart && customEnd) {
      loadPeriodData(
        currentProduct.id,
        "custom",
        customStart,
        customEnd,
        false,
      );
    }
  };

  const handleRegenerateBrief = () => {
    if (currentProduct) {
      if (selectedPeriod === "custom") {
        loadPeriodData(
          currentProduct.id,
          "custom",
          customStart,
          customEnd,
          true,
        );
      } else {
        loadPeriodData(
          currentProduct.id,
          selectedPeriod,
          undefined,
          undefined,
          true,
        );
      }
    }
  };

  const analyzedFeedback = feedback.filter((f) => f.analysis);

  // Stats calculations
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
        : 0,
  };

  const sentimentScore =
    stats.analyzed > 0
      ? (((stats.positive - stats.negative) / stats.analyzed) * 100).toFixed(0)
      : 0;

  // Chart data
  const sentimentData = [
    { name: "Positive", value: stats.positive, color: "hsl(var(--success))" },
    { name: "Neutral", value: stats.neutral, color: "hsl(var(--warning))" },
    {
      name: "Negative",
      value: stats.negative,
      color: "hsl(var(--destructive))",
    },
  ];

  const priorityData = [
    {
      name: "High",
      value: stats.highPriority,
      color: "hsl(var(--destructive))",
    },
    {
      name: "Medium",
      value: stats.mediumPriority,
      color: "hsl(var(--warning))",
    },
    { name: "Low", value: stats.lowPriority, color: "hsl(var(--info))" },
  ];

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

  // 7-day trend
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

  // Top issues (negative + high priority)
  const topIssues = analyzedFeedback
    .filter(
      (f) =>
        f.analysis?.sentiment === "negative" && f.analysis?.priority === "high",
    )
    .slice(0, 5);

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
            className="animate-pulse px-3 py-1 text-xs font-semibold"
          >
            🚨 Critical Alert
          </Badge>
        );
      case "Action Required":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 text-xs font-semibold">
            ⚠️ Action Required
          </Badge>
        );
      case "Healthy":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs font-semibold">
            ✅ Operationally Healthy
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="px-3 py-1 text-xs font-semibold"
          >
            📊 Operationally Stable
          </Badge>
        );
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    if (urgency.includes("Immediate")) {
      return (
        <Badge variant="destructive" className="text-xs">
          ⚡ {urgency}
        </Badge>
      );
    }
    if (urgency.includes("Short-Term")) {
      return (
        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs">
          ⏱️ {urgency}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        📋 {urgency}
      </Badge>
    );
  };

  return (
    <AppLayout
      title="Insights"
      description={`Executive Operations & Analytics for ${currentProduct.name}`}
    >
      <div className="space-y-6">
        {/* ============================================================== */}
        {/* TIME PERIOD SELECTOR BAR                                      */}
        {/* ============================================================== */}
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
                  {executiveBrief?.period_label ||
                    (selectedPeriod === "all" ? "All Time" : selectedPeriod)}
                </span>
              </div>
            </div>

            {/* Segmented Period Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-background/80 p-1 rounded-lg border border-border/60">
              <Button
                variant={selectedPeriod === "7d" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("7d")}
                className="h-7 text-xs px-2.5"
              >
                Last 7 Days
              </Button>
              <Button
                variant={selectedPeriod === "30d" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("30d")}
                className="h-7 text-xs px-2.5"
              >
                Last 30 Days
              </Button>
              <Button
                variant={selectedPeriod === "90d" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("90d")}
                className="h-7 text-xs px-2.5"
              >
                Last 90 Days
              </Button>
              <Button
                variant={selectedPeriod === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("all")}
                className="h-7 text-xs px-2.5"
              >
                All Time
              </Button>
              <Button
                variant={selectedPeriod === "custom" ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("custom")}
                className="h-7 text-xs px-2.5 gap-1"
              >
                <Calendar className="h-3 w-3" />
                Custom Range
              </Button>
            </div>
          </div>

          {/* Collapsible Custom Date Range Picker */}
          {showCustomPicker && (
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={handleApplyCustomRange}
                disabled={!customStart || !customEnd || isLoading}
                className="h-7 text-xs px-3"
              >
                Apply Custom Range
              </Button>
            </div>
          )}
        </Card>

        {/* ============================================================== */}
        {/* HERO: AI EXECUTIVE OPERATIONAL BRIEF & MACRO DECISION ENGINE   */}
        {/* ============================================================== */}
        <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight">
                    AI Executive Operational Brief
                  </CardTitle>
                  {executiveBrief &&
                    getStatusBadge(executiveBrief.macro_health_status)}
                  <Badge variant="outline" className="text-xs font-normal">
                    📅 {executiveBrief?.period_label || "All Time"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                {executiveBrief && (
                  <span className="text-xs text-muted-foreground mr-1">
                    {executiveBrief.is_cached
                      ? "⚡ Cached (Instant)"
                      : "✨ Live Synthesized"}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateBrief}
                  disabled={isRefreshingBrief || isBriefLoading}
                  className="gap-2 text-xs"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshingBrief ? "animate-spin" : ""}`}
                  />
                  {isRefreshingBrief ? "Synthesizing..." : "Regenerate Brief"}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isBriefLoading ? (
              <div className="space-y-4 py-8">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm">
                    Synthesizing macro operational brief for{" "}
                    {executiveBrief?.period_label || selectedPeriod}...
                  </p>
                </div>
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded mx-auto" />
                <div className="h-20 w-full bg-muted animate-pulse rounded" />
              </div>
            ) : executiveBrief ? (
              <>
                {/* 1. Quantified Impact Correlation Banner */}
                {executiveBrief.impact_correlation && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span>
                        Impact Correlation Finding (
                        {executiveBrief.period_label}):
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed font-medium">
                      {
                        executiveBrief.impact_correlation
                          .quantified_impact_statement
                      }
                    </p>
                    {executiveBrief.impact_correlation.root_cause_diagnosis && (
                      <p className="text-xs opacity-90 pt-1">
                        <strong className="underline">
                          Root Cause Diagnosis:
                        </strong>{" "}
                        {executiveBrief.impact_correlation.root_cause_diagnosis}
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Executive Headline & Summary */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {executiveBrief.headline}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {executiveBrief.executive_summary}
                  </p>
                </div>

                {/* 3. Top Strategic Operational Decisions */}
                {executiveBrief.top_strategic_decisions &&
                  executiveBrief.top_strategic_decisions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Top Strategic Operational Decisions For Leadership
                        </h4>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        {executiveBrief.top_strategic_decisions.map(
                          (decision, index) => (
                            <div
                              key={index}
                              className="flex flex-col justify-between p-4 rounded-lg bg-card border border-border/80 hover:border-primary/40 transition-all shadow-sm space-y-3"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                                    #{decision.rank || index + 1}
                                  </span>
                                  {getUrgencyBadge(decision.urgency)}
                                </div>

                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-normal text-muted-foreground"
                                >
                                  📍 {decision.department_or_area}
                                </Badge>

                                <h5 className="font-semibold text-sm leading-snug">
                                  {decision.title}
                                </h5>

                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {decision.decision}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-border/50">
                                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                  {decision.expected_roi_or_impact}
                                </p>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* 4. Strengths & Best Practices to Reinforce */}
                {executiveBrief.strengths_to_reinforce &&
                  executiveBrief.strengths_to_reinforce.length > 0 && (
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          Operational Strengths to Reinforce (
                          {executiveBrief.period_label}):
                        </span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
                        {executiveBrief.strengths_to_reinforce.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">
                  No feedback recorded for{" "}
                  {selectedPeriod === "all" ? "this product" : selectedPeriod}.
                  Select another period or click "Regenerate Brief".
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================================== */}
        {/* KEY METRICS OVERVIEW (TIME-WINDOW FILTERED)                    */}
        {/* ============================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {isLoading ? (
                  <div className="h-9 w-16 bg-muted animate-pulse rounded mx-auto mb-1" />
                ) : (
                  <p className="text-3xl font-bold">{stats.total}</p>
                )}
                <p className="text-sm text-muted-foreground">Period Feedback</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              !isLoading && Number(sentimentScore) >= 0
                ? "border-success/30 bg-success/5"
                : "border-destructive/30 bg-destructive/5"
            }
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {isLoading ? (
                    <div className="h-9 w-20 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
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
                    </>
                  )}
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
                  <Star className="h-5 w-5 text-warning fill-warning" />
                  {isLoading ? (
                    <div className="h-9 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {stats.avgRating.toFixed(1)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                {isLoading ? (
                  <div className="h-9 w-12 bg-muted animate-pulse rounded mx-auto mb-1" />
                ) : (
                  <p className="text-3xl font-bold text-success">
                    {stats.positive}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Positive</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              !isLoading && stats.highPriority > 0
                ? "border-destructive/30 bg-destructive/5"
                : ""
            }
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {isLoading ? (
                    <div className="h-9 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <>
                      {stats.highPriority > 0 && (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      )}
                      <p
                        className={`text-3xl font-bold ${stats.highPriority > 0 ? "text-destructive" : ""}`}
                      >
                        {stats.highPriority}
                      </p>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* CHARTS ROW                                                     */}
        {/* ============================================================== */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Sentiment Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sentiment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="h-24 w-24 bg-muted animate-pulse rounded-full" />
                </div>
              ) : stats.analyzed === 0 ? (
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
                  </div>
                  <div className="flex justify-center gap-3 mt-2">
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

          {/* Priority Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="h-24 w-24 bg-muted animate-pulse rounded-full" />
                </div>
              ) : stats.analyzed === 0 ? (
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

          {/* Activity Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <div className="h-16 w-full bg-muted animate-pulse rounded" />
                </div>
              ) : stats.total === 0 ? (
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

        {/* ============================================================== */}
        {/* IMPACT CORRELATION MATRIX & CATEGORY DISTRIBUTION             */}
        {/* ============================================================== */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Category Volume Distribution
              </CardTitle>
              <CardDescription>
                Mentions across categories (
                {executiveBrief?.period_label || "All Time"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-2 w-full bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>

          {/* Mathematical Impact Correlation Matrix */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base">
                  Impact Correlation Matrix
                </CardTitle>
              </div>
              <CardDescription>
                Identifies highest % friction driver (
                {executiveBrief?.period_label || "All Time"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {impactMetrics &&
              impactMetrics.categories &&
              impactMetrics.categories.length > 0 ? (
                <div className="space-y-4">
                  {impactMetrics.categories.map((item, idx) => (
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
                              #1 Bottleneck
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {item.total_count} mentions in period
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Share of Period Negative Feedback:
                          </span>
                          <span className="font-bold text-destructive">
                            {item.neg_share_percent.toFixed(1)}% (
                            {item.neg_count} reviews)
                          </span>
                        </div>
                        <Progress
                          value={item.neg_share_percent}
                          className="h-1.5 bg-muted"
                        />

                        <div className="flex justify-between text-xs pt-1">
                          <span className="text-muted-foreground">
                            Share of Period High-Priority Complaints:
                          </span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {item.high_priority_share_percent.toFixed(1)}% (
                            {item.high_priority_count} critical)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No feedback in this period to correlate.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* TOP INDIVIDUAL ISSUES TO ADDRESS                               */}
        {/* ============================================================== */}
        {!isLoading && topIssues.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base">
                  Top Critical Feedback Items (
                  {executiveBrief?.period_label || "All Time"})
                </CardTitle>
              </div>
              <CardDescription>
                High Priority submissions requiring direct attention in this
                timeframe
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
                      <p className="text-sm">{fb.text}</p>
                      {fb.analysis && (
                        <p className="text-sm text-muted-foreground italic">
                          AI Summary: {fb.analysis.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {fb.analysis?.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleDateString("en-US")}
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
    </AppLayout>
  );
}

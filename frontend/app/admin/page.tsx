"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Activity,
  Sparkles,
  Server,
  Users,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Play,
  Pause,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminOverviewPage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  const [overview, setOverview] = useState<any>(null);
  const [queue, setQueue] = useState<any>(null);

  // RBAC Access Guard: Strictly verify role === 'admin'
  useEffect(() => {
    if (!isBootstrapping) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "admin") {
        router.replace("/");
      }
    }
  }, [user, isBootstrapping, router]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewData, queueData] = await Promise.allSettled([
        api.admin.getOverview(),
        api.admin.getQueue(),
      ]);

      if (overviewData.status === "fulfilled") setOverview(overviewData.value);
      if (queueData.status === "fulfilled") setQueue(queueData.value);
    } catch (err) {
      console.error("Failed to load overview telemetry", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadData();
    }
  }, [user, loadData]);

  // Background Live Heartbeat (every 6s)
  useEffect(() => {
    if (!isLivePolling || user?.role !== "admin") return;

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const [overviewData, queueData] = await Promise.allSettled([
          api.admin.getOverview(),
          api.admin.getQueue(),
        ]);
        if (overviewData.status === "fulfilled") setOverview(overviewData.value);
        if (queueData.status === "fulfilled") setQueue(queueData.value);
        const now = new Date();
        setLastSyncTime(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
        );
      } catch {
        // silent background poll
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isLivePolling, user]);

  if (isBootstrapping || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">Verifying Platform Admin Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Platform Pulse"
      description="SaaS health, platform-wide feedback ingestion, CSAT & sentiment breakdown"
      activeTab="overview"
      actions={
        <div className="flex items-center gap-2">
          {/* Live Heartbeat Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <span className="relative flex h-2 w-2">
              {isLivePolling && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLivePolling ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              ></span>
            </span>
            <span className="font-semibold text-[10px] tracking-wide font-mono uppercase text-zinc-300">
              {isLivePolling ? "LIVE 6s" : "PAUSED"}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400 text-[10px]">{lastSyncTime}</span>
          </div>

          {/* Toggle Live Stream */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLivePolling((prev) => !prev)}
            className="h-8 text-xs gap-1 border-border/60 hover:bg-muted/50"
          >
            {isLivePolling ? (
              <Pause className="h-3 w-3 text-amber-500" />
            ) : (
              <Play className="h-3 w-3 text-emerald-500" />
            )}
            <span className="hidden sm:inline">{isLivePolling ? "Pause" : "Resume"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Executive Ribbon Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Platform Tenants & Users
              </CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {overview?.tenants?.totalTenants ?? 0} <span className="text-sm font-normal text-muted-foreground">tenants</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>{overview?.tenants?.totalUsers ?? 0} platform users</span>
                <span>•</span>
                <span>{overview?.tenants?.totalProducts ?? 0} products active</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Platform Ingestion
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {overview?.intake?.totalFeedbacks ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <span className="text-emerald-500 font-semibold flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> +{overview?.intake?.intake24h ?? 0} in 24h
                </span>
                <span>•</span>
                <span>CSAT {overview?.intake?.avgCsat ?? 0} ★</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                AI Gateway Cost & Burn
              </CardTitle>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                ${overview?.aiEngine?.estimatedCostUsd ?? "0.0000"} <span className="text-xs font-normal text-muted-foreground">USD</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span>{overview?.aiEngine?.avgLatencyMs ?? 0}ms avg latency</span>
                <span>•</span>
                <span>{(Number(overview?.aiEngine?.totalTokens ?? 0) / 1000).toFixed(1)}k tokens</span>
                {overview?.aiEngine?.activeModel && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-foreground font-medium truncate max-w-[140px]">{overview.aiEngine.activeModel}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Platform Escalations & Queue
              </CardTitle>
              <Server className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground flex items-center gap-2">
                <span className={overview?.intake?.p0Escalations > 0 ? "text-rose-500" : "text-foreground"}>
                  {overview?.intake?.p0Escalations ?? 0}
                </span>
                <span className="text-xs font-normal text-muted-foreground">P0 active</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span className="font-medium text-emerald-500">Queue: {queue?.status ?? "healthy"}</span>
                <span>•</span>
                <span>{queue?.queue?.queued ?? 0} queued</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Ratio & Platform Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Platform-Wide Sentiment Distribution</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {overview?.sentiment?.total ?? 0} Analyzed
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Global breakdown of customer sentiment across all connected tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Horizontal Bar */}
              <div className="h-4 w-full rounded-full bg-muted/60 overflow-hidden flex">
                <div
                  style={{ width: `${overview?.sentiment?.positivePct ?? 0}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title={`Positive: ${overview?.sentiment?.positivePct ?? 0}%`}
                />
                <div
                  style={{ width: `${overview?.sentiment?.neutralPct ?? 0}%` }}
                  className="bg-amber-500 transition-all duration-500"
                  title={`Neutral: ${overview?.sentiment?.neutralPct ?? 0}%`}
                />
                <div
                  style={{ width: `${overview?.sentiment?.negativePct ?? 0}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title={`Negative: ${overview?.sentiment?.negativePct ?? 0}%`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 text-center">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Positive</p>
                  <p className="text-xl font-bold text-foreground">{overview?.sentiment?.positivePct ?? 0}%</p>
                  <p className="text-[10px] text-muted-foreground">{overview?.sentiment?.positive ?? 0} reviews</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Neutral</p>
                  <p className="text-xl font-bold text-foreground">{overview?.sentiment?.neutralPct ?? 0}%</p>
                  <p className="text-[10px] text-muted-foreground">{overview?.sentiment?.neutral ?? 0} reviews</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Negative</p>
                  <p className="text-xl font-bold text-foreground">{overview?.sentiment?.negativePct ?? 0}%</p>
                  <p className="text-[10px] text-muted-foreground">{overview?.sentiment?.negative ?? 0} reviews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Platform Health</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Active infrastructure systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                <span className="font-medium text-foreground">
                  {overview?.aiEngine?.provider === "local"
                    ? `Local LLM (${overview?.aiEngine?.activeModel ?? "Active"})`
                    : `Google GenAI (${overview?.aiEngine?.activeModel ?? "Gemini"})`}
                </span>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 text-[10px]">
                  CONNECTED
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                <span className="font-medium text-foreground">Background Worker (BullMQ/PG)</span>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 text-[10px]">
                  {queue?.status?.toUpperCase() ?? "ACTIVE"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                <span className="font-medium text-foreground">Anti-Abuse Fraud Shield</span>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 text-[10px]">
                  5 LAYERS ON
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                <span className="font-medium text-foreground">Database Storage & Migrations</span>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 text-[10px]">
                  016 APPLIED
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

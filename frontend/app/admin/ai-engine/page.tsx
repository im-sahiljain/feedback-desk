"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Sparkles,
  RefreshCw,
  Play,
  Pause,
  Coins,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpRight,
  Layers,
  MessageSquare,
  Tag,
  Hash,
  Building2,
  ChevronLeft,
  ChevronRight,
  Activity,
  SlidersHorizontal,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function AdminAiEnginePage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // Metrics Data
  const [aiMetrics, setAiMetrics] = useState<any>(null);

  // Telemetry Logs Data
  const [logs, setLogs] = useState<any[]>([]);
  const [logsPagination, setLogsPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [isLogsLoading, setIsLogsLoading] = useState<boolean>(false);

  // Filters for Telemetry Logs
  const [filterOperation, setFilterOperation] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Active Model Health Probe State
  const [probeResult, setProbeResult] = useState<any>(null);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  const handleProbe = async () => {
    setIsProbing(true);
    try {
      const res = await api.admin.probeAi();
      setProbeResult({ ...res, success: true });
    } catch (err: any) {
      setProbeResult({
        success: false,
        error: err?.message || "Health probe failed",
      });
    } finally {
      setIsProbing(false);
    }
  };

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

  const loadMetrics = useCallback(async () => {
    try {
      const res = await api.admin.getAiMetrics();
      setAiMetrics(res);
    } catch (err) {
      console.error("Failed to load AI metrics", err);
    }
  }, []);

  const loadLogs = useCallback(
    async (page = 1) => {
      setIsLogsLoading(true);
      try {
        const res = await api.admin.getAiLogs({
          page,
          limit: 15,
          operation: filterOperation !== "all" ? filterOperation : undefined,
          status: filterStatus !== "all" ? filterStatus : undefined,
          search: searchQuery.trim() || undefined,
        });
        setLogs(res.logs || []);
        if (res.pagination) {
          setLogsPagination(res.pagination);
        }
      } catch (err) {
        console.error("Failed to load AI logs", err);
      } finally {
        setIsLogsLoading(false);
      }
    },
    [filterOperation, filterStatus, searchQuery]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadMetrics(), loadLogs(1)]);
    setIsLoading(false);
  }, [loadMetrics, loadLogs]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadData();
    }
  }, [user, loadData]);

  // Handle filter changes for logs
  useEffect(() => {
    if (user?.role === "admin") {
      loadLogs(1);
    }
  }, [filterOperation, filterStatus, loadLogs, user]);

  // Live Auto-Polling (every 6s)
  useEffect(() => {
    if (!isLivePolling || user?.role !== "admin") return;

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        await loadMetrics();
        // Silently reload current page of logs if on page 1
        if (logsPagination.page === 1) {
          const res = await api.admin.getAiLogs({
            page: 1,
            limit: 15,
            operation: filterOperation !== "all" ? filterOperation : undefined,
            status: filterStatus !== "all" ? filterStatus : undefined,
            search: searchQuery.trim() || undefined,
          });
          setLogs(res.logs || []);
          if (res.pagination) {
            setLogsPagination(res.pagination);
          }
        }
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
  }, [isLivePolling, user, loadMetrics, logsPagination.page, filterOperation, filterStatus, searchQuery]);

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

  const obs = aiMetrics?.observability || {};
  const operations = aiMetrics?.operationsBreakdown || [];
  const topProducts = aiMetrics?.topProductCosts || [];
  const totalSpend = Number(obs.estimatedCostUsd || 0);

  const getOperationBadge = (op: string) => {
    switch (op) {
      case "chat":
        return (
          <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/25 font-mono text-[10px] gap-1">
            <MessageSquare className="h-2.5 w-2.5" />
            AI Chat
          </Badge>
        );
      case "embedding":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[10px] gap-1">
            <Hash className="h-2.5 w-2.5" />
            Embedding
          </Badge>
        );
      case "clustering_verification":
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/25 font-mono text-[10px] gap-1">
            <Layers className="h-2.5 w-2.5" />
            Clustering
          </Badge>
        );
      default:
        return (
          <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/25 font-mono text-[10px] gap-1">
            <Tag className="h-2.5 w-2.5" />
            Classification
          </Badge>
        );
    }
  };

  const getOperationIcon = (op: string) => {
    switch (op) {
      case "chat":
        return <MessageSquare className="h-4 w-4 text-sky-400" />;
      case "embedding":
        return <Hash className="h-4 w-4 text-emerald-400" />;
      case "clustering_verification":
        return <Layers className="h-4 w-4 text-purple-400" />;
      default:
        return <Tag className="h-4 w-4 text-orange-400" />;
    }
  };

  return (
    <AdminLayout
      title="AI Engine & Cost Observability"
      description="Production telemetry ledger, token consumption meter, real-time burn rate & per-feature costing"
      activeTab="ai-engine"
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
        {/* Active AI Gateway Runtime & Health Probe */}
        <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Cpu className="h-4 w-4 text-orange-500" />
                  <span>Active AI Gateway Runtime</span>
                  <Badge
                    variant="outline"
                    className="border-orange-500/40 text-orange-400 bg-orange-500/10 text-xs font-mono capitalize"
                  >
                    {obs.activeProvider === "local" ? "Local LLM" : "Google GenAI"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Unified AI Gateway adapter routing classifications, embeddings, and executive digests
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleProbe}
                  disabled={isProbing}
                  className="h-8 text-xs gap-1.5 border-orange-500/30 hover:bg-orange-500/10 text-orange-400"
                >
                  <RefreshCw className={`h-3 w-3 ${isProbing ? "animate-spin" : ""}`} />
                  <span>{isProbing ? "Probing..." : "Test Model Connection"}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Primary LLM Model</span>
              <p className="text-sm font-bold text-foreground font-mono truncate" title={obs.activeModel ?? "gemini-3.5-flash-lite"}>
                {obs.activeModel ?? "gemini-3.5-flash-lite"}
              </p>
              <p className="text-[10px] text-muted-foreground">Main qualitative classifier</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Embedding Model</span>
              <p className="text-sm font-bold text-foreground font-mono truncate" title={obs.activeEmbeddingModel ?? "gemini-embedding-001"}>
                {obs.activeEmbeddingModel ?? "gemini-embedding-001"}
              </p>
              <p className="text-[10px] text-muted-foreground">Vector similarity engine</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Quota / Pacing Tier</span>
              <p className="text-sm font-bold text-emerald-400 truncate">
                {obs.activeProvider === "local" ? "Unthrottled (Zero Cost)" : obs.activeTier === "payg" ? "Pay-As-You-Go" : "Free Tier (15 RPM)"}
              </p>
              <p className="text-[10px] text-muted-foreground">Rate limit governor</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Connectivity Health</span>
              {probeResult ? (
                probeResult.success ? (
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Connected ({probeResult.latencyMs}ms)
                  </p>
                ) : (
                  <p className="text-sm font-bold text-rose-400 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    Degraded
                  </p>
                )
              ) : (
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ready to probe
                </p>
              )}
              <p className="text-[10px] text-muted-foreground truncate">
                {probeResult ? (probeResult.success ? `Checked at ${new Date(probeResult.checkedAt).toLocaleTimeString()}` : probeResult.error) : "Click test to ping active model"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top 4 KPI Observability & Cost Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Running Spend */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Coins className="h-16 w-16 text-orange-500" />
            </div>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-orange-500" />
                Cumulative Spend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground tracking-tight">
                ${totalSpend.toFixed(4)} <span className="text-xs font-normal text-muted-foreground">USD</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span className="text-emerald-400 font-medium font-mono">
                  {obs.totalAiJobs ? `${obs.totalAiJobs} calls logged` : "0 calls"}
                </span>
                <span>• {obs.activeModel ? `${obs.activeModel} rates` : "Gateway rates"}</span>
              </p>
            </CardContent>
          </Card>

          {/* 2. Token Consumption */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Cpu className="h-16 w-16 text-sky-500" />
            </div>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-sky-400" />
                Total Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground tracking-tight">
                {Number(obs.totalTokens || 0) > 1_000_000
                  ? `${(Number(obs.totalTokens || 0) / 1_000_000).toFixed(2)}M`
                  : `${(Number(obs.totalTokens || 0) / 1000).toFixed(1)}k`}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                In: {(Number(obs.promptTokens || 0) / 1000).toFixed(1)}k • Out: {(Number(obs.candidateTokens || 0) / 1000).toFixed(1)}k
              </p>
            </CardContent>
          </Card>

          {/* 3. Latency Metrics */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Zap className="h-16 w-16 text-amber-500" />
            </div>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Engine Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground tracking-tight">
                {obs.avgLatencyMs ?? 0}ms
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
                P95 Latency: <span className="text-foreground font-semibold">{obs.p95LatencyMs ?? 0}ms</span>
              </p>
            </CardContent>
          </Card>

          {/* 4. Engine Health & Success */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            </div>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {obs.successRatePct ?? 100}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                <span>{obs.aiSuccessRatioPct ?? obs.geminiRatioPct ?? 100}% primary AI</span>
                {obs.failureCount > 0 && (
                  <span className="text-rose-400">• {obs.failureCount} errors</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cost Breakdown & Multi-Tenant Attribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Operation Cost Ledger (2 Cols) */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                    AI Spend Breakdown by Feature
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Attribution of token consumption and API spend across classification, chat, and embeddings
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {operations.length} Active Operations
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {operations.length > 0 ? (
                <div className="space-y-3.5">
                  {operations.map((op: any, i: number) => {
                    const cost = Number(op.cost_usd || 0);
                    const pct = totalSpend > 0 ? Math.min(100, Math.round((cost / totalSpend) * 100)) : 0;
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-medium">
                            {getOperationIcon(op.operation_type)}
                            <span className="capitalize text-foreground font-semibold">
                              {op.operation_type.replace("_", " ")}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              ({op.count} calls)
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground font-mono">
                              ${cost.toFixed(4)}
                            </span>
                            <span className="text-muted-foreground text-[11px] ml-1.5 font-mono">
                              ({pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-muted/60 mt-2 overflow-hidden">
                          <div
                            style={{ width: `${Math.max(4, pct)}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${
                              op.operation_type === "chat"
                                ? "bg-sky-500"
                                : op.operation_type === "embedding"
                                ? "bg-emerald-500"
                                : op.operation_type === "clustering_verification"
                                ? "bg-purple-500"
                                : "bg-orange-500"
                            }`}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 font-mono">
                          <span>
                            Tokens: {((Number(op.total_tokens) || 0) / 1000).toFixed(1)}k (In:{" "}
                            {((Number(op.prompt_tokens) || 0) / 1000).toFixed(1)}k • Out:{" "}
                            {((Number(op.candidate_tokens) || 0) / 1000).toFixed(1)}k)
                          </span>
                          <span>Avg: {op.avg_latency_ms || 0}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No operational metrics recorded yet. Trigger classification or AI chat to see breakdown.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Tenant / Product Attribution (1 Col) */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-400" />
                Top Workspaces by Spend
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Multi-tenant product attribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((p: any, i: number) => {
                    const cost = Number(p.total_cost_usd || 0);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-muted/20 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">
                            {p.product_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {p.total_calls} calls • {((Number(p.total_tokens) || 0) / 1000).toFixed(1)}k tokens
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="font-bold text-foreground font-mono text-xs">
                            ${cost.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No product metrics recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Multi-Model Telemetry & Usage Ledger */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-orange-500" />
                  Multi-Model Runtime Telemetry & Performance Ledger
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Historical telemetry and performance metrics aggregated across all active and configured LLM models
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {aiMetrics?.modelsBreakdown?.length ?? 0} Models Detected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5 font-semibold">Model Name</th>
                    <th className="p-2.5 font-semibold">Provider</th>
                    <th className="p-2.5 font-semibold text-right">Inferences</th>
                    <th className="p-2.5 font-semibold text-right">Avg Latency</th>
                    <th className="p-2.5 font-semibold text-right">P95 Latency</th>
                    <th className="p-2.5 font-semibold text-right">Total Tokens</th>
                    <th className="p-2.5 font-semibold text-right">Total Cost ($)</th>
                    <th className="p-2.5 font-semibold text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {aiMetrics?.modelsBreakdown && aiMetrics.modelsBreakdown.length > 0 ? (
                    aiMetrics.modelsBreakdown.map((row: any, idx: number) => {
                      const total = Number(row.total_calls) || 0;
                      const successes = Number(row.success_count) || 0;
                      const pct = total > 0 ? ((successes / total) * 100).toFixed(1) : "100.0";
                      const cost = Number(row.total_cost_usd) || 0;
                      return (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 font-mono font-medium text-foreground">
                            {row.model_name}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="capitalize text-[10px] py-0">
                              {row.provider}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                            {row.total_calls}
                          </td>
                          <td className="p-2.5 text-right font-mono text-zinc-300">
                            {row.avg_latency_ms}ms
                          </td>
                          <td className="p-2.5 text-right font-mono text-zinc-400">
                            {row.p95_latency_ms}ms
                          </td>
                          <td className="p-2.5 text-right font-mono text-zinc-300">
                            {(Number(row.total_tokens) / 1000).toFixed(1)}k
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-emerald-400">
                            ${cost.toFixed(4)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-400">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-muted-foreground text-xs">
                        No model breakdown telemetry logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI Category Taxonomy & Friction Points */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-orange-400" />
                  AI Classification Taxonomy Breakdown
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Automated category labeling generated by AI Gateway across customer reviews
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                Top Categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {aiMetrics?.categoryTaxonomy && aiMetrics.categoryTaxonomy.length > 0 ? (
                aiMetrics.categoryTaxonomy.map((cat: any, i: number) => {
                  const total = aiMetrics?.observability?.totalAiJobs || 1;
                  const pct = Math.min(100, Math.round((Number(cat.count) / total) * 100));
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-border/40 bg-muted/20 space-y-1.5"
                    >
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground truncate" title={cat.category_name}>
                          {cat.category_name}
                        </span>
                        <span className="text-muted-foreground font-mono ml-1">{cat.count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(5, pct)}%` }}
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4 col-span-full">
                  No taxonomy categories recorded yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Granular Real-Time AI Execution Telemetry Logs */}
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  Live AI Execution & Cost Telemetry Ledger
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Granular logs for every AI Gateway inference, token consumption, latency, and error code
                </CardDescription>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                Total Logs: <span className="text-foreground font-semibold">{logsPagination.total}</span>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search model, error, workspace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadLogs(1)}
                  className="h-8 pl-8 text-xs bg-muted/30 border-border/60"
                />
              </div>

              {/* Operation Filter Buttons */}
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                {["all", "classification", "chat", "embedding", "clustering_verification"].map((op) => (
                  <button
                    key={op}
                    onClick={() => setFilterOperation(op)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      filterOperation === op
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {op === "all"
                      ? "All"
                      : op === "clustering_verification"
                      ? "Clustering"
                      : op.charAt(0).toUpperCase() + op.slice(1)}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50 text-xs">
                {["all", "success", "error"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      filterStatus === st
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadLogs(1)}
                className="h-8 text-xs gap-1"
                disabled={isLogsLoading}
              >
                <Filter className="h-3 w-3" />
                Apply
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Table wrapper with sticky column header best practice */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Operation</th>
                    <th className="py-2.5 px-4">Model & Provider</th>
                    <th className="py-2.5 px-4">Workspace / User</th>
                    <th className="py-2.5 px-4 text-right">Tokens (In / Out)</th>
                    <th className="py-2.5 px-4 text-right">Cost (USD)</th>
                    <th className="py-2.5 px-4 text-right">Latency</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {isLogsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-orange-500" />
                          <span>Loading telemetry ledger...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length > 0 ? (
                    logs.map((log) => {
                      const date = new Date(log.created_at);
                      const timeStr = `${date.toLocaleDateString()} ${date
                        .getHours()
                        .toString()
                        .padStart(2, "0")}:${date
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")}:${date
                        .getSeconds()
                        .toString()
                        .padStart(2, "0")}`;

                      const inTokens = log.token_input || 0;
                      const outTokens = log.token_output || 0;
                      const cost = Number(log.estimated_cost_usd || 0);

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Time */}
                          <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap text-[11px]">
                            {timeStr}
                          </td>

                          {/* Operation */}
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            {getOperationBadge(log.operation_type)}
                          </td>

                          {/* Model */}
                          <td className="py-2.5 px-4 whitespace-nowrap text-foreground text-[11px]">
                            <div className="font-semibold text-zinc-200">
                              {log.model_name || "ai-model"}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {log.provider || "ai"}
                            </span>
                          </td>

                          {/* Workspace / User */}
                          <td className="py-2.5 px-4 whitespace-nowrap font-sans text-[11px]">
                            <div className="font-medium text-foreground truncate max-w-[140px]" title={log.product_name}>
                              {log.product_name || "Platform / Global"}
                            </div>
                            {log.user_email && (
                              <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={log.user_email}>
                                {log.user_email}
                              </div>
                            )}
                          </td>

                          {/* Tokens */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap text-[11px]">
                            <span className="text-foreground font-semibold">
                              {(inTokens + outTokens).toLocaleString()}
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              {inTokens} in • {outTokens} out
                            </div>
                          </td>

                          {/* Cost */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap font-semibold text-foreground text-[11px]">
                            ${cost.toFixed(6)}
                          </td>

                          {/* Latency */}
                          <td className="py-2.5 px-4 text-right whitespace-nowrap text-[11px]">
                            <span
                              className={
                                log.latency_ms > 2000
                                  ? "text-amber-400"
                                  : "text-foreground"
                              }
                            >
                              {log.latency_ms}ms
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap">
                            {log.success ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                                OK
                              </Badge>
                            ) : (
                              <Badge
                                className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono"
                                title={log.error_code || "Unknown error"}
                              >
                                {log.error_code || "ERROR"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground font-sans text-xs">
                        No AI execution logs matching current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {logsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 text-xs">
                <span className="text-muted-foreground font-mono text-[11px]">
                  Page {logsPagination.page} of {logsPagination.totalPages} ({logsPagination.total} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPagination.page <= 1 || isLogsLoading}
                    onClick={() => loadLogs(logsPagination.page - 1)}
                    className="h-7 text-xs gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logsPagination.page >= logsPagination.totalPages || isLogsLoading}
                    onClick={() => loadLogs(logsPagination.page + 1)}
                    className="h-7 text-xs gap-1"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Server,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Flame,
  Star,
  Timer,
  Zap,
  Gauge,
  Activity,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface QueueJob {
  id: string;
  job_type: string;
  status: "queued" | "processing" | "completed" | "retrying" | "dead";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  available_at: string | null;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
  feedback_id?: string;
  feedback_text?: string;
  rating?: number | null;
  category_name?: string | null;
  sentiment_label?: string | null;
  priority_label?: string | null;
  product_name?: string | null;
}

export default function AdminQueuePage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  const [queue, setQueue] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

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
      const res = await api.admin.getQueue();
      setQueue(res);
      const now = new Date();
      setLastSyncTime(
        `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
      );
    } catch (err) {
      console.error("Failed to load queue metrics", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadData();
    }
  }, [user, loadData]);

  // Live Auto-Polling (every 5s)
  useEffect(() => {
    if (!isLivePolling || user?.role !== "admin") return;

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await api.admin.getQueue();
        setQueue(res);
        const now = new Date();
        setLastSyncTime(
          `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
        );
      } catch {
        // silent background poll
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLivePolling, user]);

  const handleReplayDeadJobs = async () => {
    setIsReplaying(true);
    try {
      const res = await api.admin.replayDeadJobs();
      toast({
        title: "Dead Letter Jobs Replayed",
        description:
          res.message || `Re-queued ${res.replayedCount} jobs successfully.`,
      });
      await loadData();
    } catch (err: any) {
      toast({
        title: "Replay Failed",
        description: err.message || "Failed to replay dead letter jobs.",
        variant: "destructive",
      });
    } finally {
      setIsReplaying(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const res = await api.admin.retryJob(jobId);
      toast({
        title: "Job Re-queued",
        description: res.message || "Job re-queued successfully.",
      });
      await loadData();
    } catch (err: any) {
      toast({
        title: "Retry Failed",
        description: err.message || "Failed to retry job.",
        variant: "destructive",
      });
    } finally {
      setRetryingJobId(null);
    }
  };

  const jobsList: QueueJob[] = queue?.jobs || [];

  const filteredJobs = useMemo(() => {
    return jobsList.filter((job) => {
      // 1. Status Filter
      if (statusFilter !== "all" && job.status !== statusFilter) {
        return false;
      }
      // 2. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = job.feedback_text?.toLowerCase().includes(q);
        const matchesProduct = job.product_name?.toLowerCase().includes(q);
        const matchesError = job.last_error?.toLowerCase().includes(q);
        const matchesId = job.id.toLowerCase().includes(q);
        return matchesText || matchesProduct || matchesError || matchesId;
      }
      return true;
    });
  }, [jobsList, statusFilter, searchQuery]);

  if (isBootstrapping || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">
            Verifying Platform Admin Credentials...
          </p>
        </div>
      </div>
    );
  }

  const queuedCount = queue?.queue?.queued ?? 0;
  const analyzingCount =
    queue?.queue?.analyzing ?? queue?.queue?.processing ?? 0;
  const completedCount = queue?.queue?.completed ?? 0;
  const failedCount = queue?.queue?.failed ?? queue?.queue?.retrying ?? 0;
  const deadCount = queue?.queue?.dead ?? 0;
  const totalCount =
    queue?.queue?.total ??
    queuedCount + analyzingCount + completedCount + failedCount + deadCount;
  const pacing = queue?.pacing;

  return (
    <AdminLayout
      title="Background Worker Queue Ops"
      description="PostgreSQL durable queue depth, in-flight processing, retry backoff & dead letter jobs"
      activeTab="queue"
      actions={
        <div className="flex items-center gap-2">
          {/* Live Pacing Delay Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[11px] text-orange-400 font-mono">
            <Timer className="h-3 w-3 text-orange-400 animate-pulse" />
            <span className="font-semibold text-[10px] uppercase text-orange-400">
              DELAY:
            </span>
            <span>{pacing?.interJobDelaySeconds ?? 4.5}s</span>
            <span className="text-orange-500/40">•</span>
            <span className="text-zinc-300 font-sans">
              ~{pacing?.effectiveRpm ?? 9.1} RPM
            </span>
            {pacing?.estimatedTimeFormatted && (
              <>
                <span className="text-orange-500/40">•</span>
                <span className="text-zinc-400 text-[10px] font-sans">
                  {pacing.estimatedTimeFormatted} left
                </span>
              </>
            )}
          </div>

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
              {isLivePolling ? "LIVE 5s" : "PAUSED"}
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
            <span className="hidden sm:inline">
              {isLivePolling ? "Pause" : "Resume"}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Dead Letter Recovery Alert Banner (Displays when dead jobs exist) */}
        {deadCount > 0 && (
          <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                  <span>{deadCount} Dead Letter Jobs Detected</span>
                  <Badge
                    variant="destructive"
                    className="text-[10px] py-0 px-1.5"
                  >
                    Action Needed
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  These jobs exceeded retry attempts before schema migration 015
                  was finalized. You can re-queue all of them to be safely
                  processed by the running worker without any downtime.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={isReplaying}
              onClick={handleReplayDeadJobs}
              className="gap-1.5 text-xs shrink-0 font-medium"
            >
              {isReplaying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Re-queuing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Replay All {deadCount} Dead Jobs
                </>
              )}
            </Button>
          </div>
        )}

        {/* 5 Top Queue KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-between">
                <span>Queued</span>
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {queuedCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Waiting for worker loop
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-between">
                <span>Analyzing</span>
                <Loader2
                  className={`h-3.5 w-3.5 text-blue-500 ${analyzingCount > 0 ? "animate-spin" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {analyzingCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                In-flight AI inferences
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-between">
                <span>Completed</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {completedCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Successfully classified
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-between">
                <span>Retrying</span>
                <RefreshCw
                  className={`h-3.5 w-3.5 text-amber-500 ${failedCount > 0 ? "animate-spin" : ""}`}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {failedCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Exponential backoff
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold flex items-center justify-between">
                <span>Dead Letter</span>
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">
                {deadCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Exceeded 5 attempts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Rate Limiting & Pacing Delay Monitor */}
        <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Timer className="h-4 w-4 text-orange-500" />
                <span>AI Rate Limit & Queue Pacing Monitor</span>
                <Badge
                  variant="outline"
                  className="border-orange-500/30 text-orange-400 text-[10px] py-0 px-1.5 font-mono"
                >
                  {pacing?.tier ?? "Active Pacing Guard"}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {pacing?.interJobDelaySeconds && pacing.interJobDelaySeconds > 0
                    ? `Active ${pacing.interJobDelaySeconds}s Pacing Delay`
                    : "Direct Low-Latency Mode"}
                </span>
              </div>
            </div>
            <CardDescription className="text-xs">
              {pacing?.interJobDelaySeconds && pacing.interJobDelaySeconds > 0
                ? `Every feedback analysis is spaced by a ${pacing.interJobDelaySeconds}s pacing delay. With ~${pacing?.avgLatencySeconds ?? 1.5}s inference latency, the worker safely operates at ~${pacing?.effectiveRpm ?? 10.2} RPM (${pacing?.rpmLimit ? `strictly within the ${pacing.rpmLimit} RPM quota` : "quota-safe"}).`
                : `Worker operates in unthrottled zero-delay mode with ~${pacing?.avgLatencySeconds ?? 1.5}s inference latency (~${pacing?.effectiveRpm ?? 40} RPM capacity).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-400" /> Inter-Job Sleep
                Delay
              </span>
              <p className="text-xl font-bold text-orange-400 font-mono">
                {pacing?.interJobDelaySeconds ?? 4.5}s
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sleep between consecutive jobs
              </p>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Activity className="h-3 w-3 text-blue-400" /> Avg Model Latency
              </span>
              <p className="text-xl font-bold text-blue-400 font-mono">
                {pacing?.avgLatencySeconds ?? 2.1}s
              </p>
              <p className="text-[10px] text-muted-foreground">
                Model inference latency
              </p>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" /> Total Cycle / Job
              </span>
              <p className="text-xl font-bold text-amber-400 font-mono">
                {pacing?.cycleSecondsPerJob ?? 6.6}s
              </p>
              <p className="text-[10px] text-muted-foreground">
                Pacing delay + model latency
              </p>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Gauge className="h-3 w-3 text-emerald-400" /> Effective
                Throughput
              </span>
              <p className="text-xl font-bold text-emerald-400 font-mono">
                ~{pacing?.effectiveRpm ?? 9.1}{" "}
                <span className="text-xs font-normal">RPM</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pacing?.rpmLimit ? `Strictly < ${pacing.rpmLimit} RPM limit` : "Uncapped local throughput"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-background/60 border border-border/50 space-y-1 col-span-2 md:col-span-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Timer className="h-3 w-3 text-purple-400" /> Est. Queue Drain
                Time
              </span>
              <p className="text-xl font-bold text-purple-400 font-mono">
                {pacing?.estimatedTimeFormatted ?? "0s"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {queuedCount} queued jobs remaining
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Worker Concurrency & Safety Specifications */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Server className="h-4 w-4 text-orange-500" />
              <span>Worker Concurrency, Safety & Lock Specifications</span>
            </CardTitle>
            <CardDescription className="text-xs">
              PostgreSQL durable job runner architecture and AI Gateway quota pacing
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                Worker Concurrency
              </span>
              <p className="font-semibold text-foreground">
                {queue?.concurrency ?? 1} Worker (Serialized)
              </p>
              <p className="text-[10px] text-muted-foreground">
                Eliminates parallel quota spikes
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                Rate Limiting Guard
              </span>
              <p className="font-semibold text-emerald-500">
                {pacing?.rpmLimit ? `${pacing.rpmLimit} RPM Ceiling (~${pacing?.effectiveRpm ?? 9.1} RPM Active)` : `Uncapped (~${pacing?.effectiveRpm ?? 40} RPM Active)`}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {pacing?.provider === "local" ? "Local direct inference" : "Dynamic provider rate limiter & backoff"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                Lock Strategy
              </span>
              <p className="font-mono text-xs font-semibold text-foreground">
                SKIP LOCKED
              </p>
              <p className="text-[10px] text-muted-foreground">
                Zero row lock contention
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">
                Worker Status
              </span>
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Processing Live
              </p>
              <p className="text-[10px] text-muted-foreground">
                Total pipeline: {totalCount} jobs
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Live Jobs Queue Stream & Table */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Live Job Stream & Queue Inspector</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time visibility into active AI Gateway inferences, queued
                items, and failure diagnostics
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search review, product or error..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs w-full sm:w-64"
                />
              </div>

              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="h-8 p-0.5 bg-muted/60">
                  <TabsTrigger value="all" className="text-[11px] px-2.5 py-1">
                    All ({jobsList.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="processing"
                    className="text-[11px] px-2.5 py-1 text-blue-500"
                  >
                    In-Flight
                  </TabsTrigger>
                  <TabsTrigger
                    value="dead"
                    className="text-[11px] px-2.5 py-1 text-rose-500"
                  >
                    Dead ({deadCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="queued"
                    className="text-[11px] px-2.5 py-1"
                  >
                    Queued
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="text-[11px] px-2.5 py-1 text-emerald-500"
                  >
                    Completed
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Target Feedback & Product</th>
                    <th className="py-2.5 px-4">Job Info</th>
                    <th className="py-2.5 px-4">Attempts</th>
                    <th className="py-2.5 px-4">Error Diagnostics</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-muted-foreground"
                      >
                        No background jobs matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => {
                      const isDead = job.status === "dead";
                      const isProcessing = job.status === "processing";
                      const isRetrying = job.status === "retrying";
                      const isCompleted = job.status === "completed";

                      return (
                        <tr
                          key={job.id}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          {/* 1. Status Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isProcessing && (
                              <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30 gap-1 text-[10px] font-medium">
                                <Loader2 className="h-3 w-3 animate-spin" />{" "}
                                In-Flight
                              </Badge>
                            )}
                            {isDead && (
                              <Badge
                                variant="destructive"
                                className="gap-1 text-[10px] font-medium"
                              >
                                <AlertCircle className="h-3 w-3" /> Dead Letter
                              </Badge>
                            )}
                            {isRetrying && (
                              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1 text-[10px] font-medium">
                                <RefreshCw className="h-3 w-3 animate-spin" />{" "}
                                Retrying
                              </Badge>
                            )}
                            {job.status === "queued" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium text-muted-foreground"
                              >
                                Queued
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1 text-[10px] font-medium">
                                <CheckCircle2 className="h-3 w-3" /> Done
                              </Badge>
                            )}
                          </td>

                          {/* 2. Feedback Preview */}
                          <td className="py-3 px-4 max-w-xs sm:max-w-md">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-xs">
                                  {job.product_name || "Unassigned Product"}
                                </span>
                                {job.rating && (
                                  <span className="flex items-center text-[10px] text-amber-500 font-medium">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 mr-0.5" />
                                    {job.rating}/5
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                                {job.feedback_text ||
                                  "No feedback text attached to job payload"}
                              </p>
                            </div>
                          </td>

                          {/* 3. Job Info */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p className="font-mono text-[11px] text-foreground">
                                {job.job_type}
                              </p>
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {job.id.substring(0, 13)}...
                              </p>
                            </div>
                          </td>

                          {/* 4. Attempts */}
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                            <span
                              className={
                                job.attempts >= job.max_attempts
                                  ? "text-rose-500 font-bold"
                                  : "text-muted-foreground"
                              }
                            >
                              {job.attempts}/{job.max_attempts}
                            </span>
                          </td>

                          {/* 5. Error Diagnostics */}
                          <td className="py-3 px-4 max-w-xs">
                            {job.last_error ? (
                              <div
                                className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 font-mono text-[10px] truncate"
                                title={job.last_error}
                              >
                                {job.last_error}
                              </div>
                            ) : isCompleted ? (
                              <span className="text-[11px] text-muted-foreground">
                                Clean execution
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                No errors reported
                              </span>
                            )}
                          </td>

                          {/* 6. Action Button */}
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {isDead || isRetrying ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={retryingJobId === job.id}
                                onClick={() => handleRetryJob(job.id)}
                                className="h-7 text-[11px] gap-1 hover:bg-muted"
                              >
                                {retryingJobId === job.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                                Retry
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(job.updated_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  },
                                )}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

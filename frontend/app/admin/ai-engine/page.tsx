"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Sparkles, RefreshCw, Play, Pause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminAiEnginePage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  const [aiMetrics, setAiMetrics] = useState<any>(null);

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
      const res = await api.admin.getAiMetrics();
      setAiMetrics(res);
    } catch (err) {
      console.error("Failed to load AI metrics", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadData();
    }
  }, [user, loadData]);

  // Live Auto-Polling (every 6s)
  useEffect(() => {
    if (!isLivePolling || user?.role !== "admin") return;

    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await api.admin.getAiMetrics();
        setAiMetrics(res);
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
      title="AI & Gemini Engine Observability"
      description="Real-time latency trends, token consumption meter, API burn rate & category taxonomy"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">AI Latency (Avg / P95)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {aiMetrics?.observability?.avgLatencyMs ?? 0}ms
              </div>
              <p className="text-xs text-muted-foreground mt-1">P95: {aiMetrics?.observability?.p95LatencyMs ?? 0}ms</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Token Consumption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {(Number(aiMetrics?.observability?.totalTokens ?? 0) / 1000).toFixed(1)}k
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In: {(Number(aiMetrics?.observability?.promptTokens ?? 0) / 1000).toFixed(1)}k • Out: {(Number(aiMetrics?.observability?.candidateTokens ?? 0) / 1000).toFixed(1)}k
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">AI vs Fallback Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                {aiMetrics?.observability?.geminiRatioPct ?? 100}%
              </div>
              <p className="text-xs text-emerald-500 mt-1">99.9% Gemini classification</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Running Cost (USD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-foreground">
                ${aiMetrics?.observability?.estimatedCostUsd ?? "0.0000"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Gemini 2.5 Flash token rates</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Category Taxonomy Heatmap */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Platform AI Category Taxonomy Breakdown</span>
              <Badge variant="outline" className="text-xs font-mono">Top Friction Points</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Classifications assigned by Google Gemini across all ingested reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiMetrics?.categoryTaxonomy && aiMetrics.categoryTaxonomy.length > 0 ? (
                aiMetrics.categoryTaxonomy.map((cat: any, i: number) => {
                  const total = aiMetrics?.observability?.totalAiJobs || 1;
                  const pct = Math.min(100, Math.round((Number(cat.count) / total) * 100));
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground">{cat.category_name}</span>
                        <span className="text-muted-foreground">{cat.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No categories recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

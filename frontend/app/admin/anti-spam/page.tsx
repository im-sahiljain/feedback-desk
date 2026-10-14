"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ShieldAlert, CheckCircle2, RefreshCw, Play, Pause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminAntiSpamPage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  const [distribution, setDistribution] = useState<any>(null);

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
      const res = await api.admin.getDistribution();
      setDistribution(res);
    } catch (err) {
      console.error("Failed to load distribution telemetry", err);
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
        const res = await api.admin.getDistribution();
        setDistribution(res);
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
      title="Anti-Spam & Distribution Telemetry"
      description="Single-use link conversion, physical Counter QR traffic & 5-layer fraud prevention"
      activeTab="anti-spam"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Single-Use Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {distribution?.links?.totalGenerated ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {distribution?.links?.completed ?? 0} completed ({distribution?.links?.conversionPct ?? 0}% conversion)
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Total Screened Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {distribution?.antiSpamShield?.totalScreened ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {distribution?.antiSpamShield?.flaggedSuspicious ?? 0} flagged suspicious
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Shield Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">100% Active</div>
              <p className="text-xs text-muted-foreground mt-1">5 multi-stage protection barriers</p>
            </CardContent>
          </Card>
        </div>

        {/* 5-Layer Shield Telemetry */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-500" />
              <span>5-Layer Anti-Abuse Shield Telemetry</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Active defenses safeguarding feedback integrity across the entire platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {distribution?.antiSpamShield?.layersActive?.map((layer: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-foreground">{layer.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{layer.drops} threats mitigated</span>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 bg-emerald-500/10 text-[10px]">
                      ACTIVE
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

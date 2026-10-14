"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  FileText,
  RefreshCw,
  Search,
  Shield,
  Clock,
  User,
  Terminal,
  Activity,
  Play,
  Pause,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: any;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAuditPage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

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
      const res = await api.admin.getAuditLogs();
      setLogs(res || []);
    } catch (err) {
      console.error("Failed to load audit logs", err);
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
        const res = await api.admin.getAuditLogs();
        setLogs(res || []);
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

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.actor_email && l.actor_email.toLowerCase().includes(q)) ||
        (l.resource_type && l.resource_type.toLowerCase().includes(q)) ||
        (l.resource_id && l.resource_id.toLowerCase().includes(q)) ||
        (l.ip_address && l.ip_address.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  const getActionBadge = (action: string) => {
    if (action.includes("role") || action.includes("user")) {
      return (
        <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 font-mono text-[11px]">
          {action}
        </Badge>
      );
    }
    if (action.includes("resolve") || action.includes("status")) {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-[11px]">
          {action}
        </Badge>
      );
    }
    if (action.includes("invitation") || action.includes("link")) {
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono text-[11px]">
          {action}
        </Badge>
      );
    }
    if (action.includes("delete") || action.includes("revoked") || action.includes("spam")) {
      return (
        <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono text-[11px]">
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-mono text-[11px] text-zinc-300 border-zinc-700">
        {action}
      </Badge>
    );
  };

  if (isBootstrapping || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-orange-400 animate-pulse" />
          <p className="text-sm text-zinc-400">Verifying administrator clearance...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      activeTab="audit"
      title="Security & System Audit Log"
      description="Immutable compliance trail recording all administrative operations, security changes, and system events"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLivePolling(!isLivePolling)}
            className={`h-8 gap-1.5 text-xs ${
              isLivePolling
                ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                : "border-zinc-800 text-zinc-400"
            }`}
          >
            {isLivePolling ? (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Live Stream
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                Paused
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs border-zinc-800 text-zinc-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Highlights */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recorded Events</p>
                <p className="text-2xl font-bold font-mono text-zinc-100">{logs.length}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Most recent 100 entries</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <FileText className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Stream Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${isLivePolling ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                  <span className="text-sm font-semibold text-zinc-200">
                    {isLivePolling ? "Realtime Ingestion" : "Polling Paused"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">Synced at {lastSyncTime}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Compliance Guard</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                    Append-Only Immutable
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">SOC2 / HIPAA Audit Spec</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Trail Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-orange-400" />
                  Audit Event Ledger
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Complete history of system-level modifications and user authorizations
                </CardDescription>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Filter by action, user, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-200 placeholder:text-zinc-500"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-zinc-900/40 text-muted-foreground uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Actor</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">Resource</th>
                    <th className="py-3 px-4 font-semibold">IP Address</th>
                    <th className="py-3 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-zinc-300 font-mono">
                  {isLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-orange-400" />
                        Loading audit trail records...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                        No audit events match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const dt = new Date(log.created_at);
                      const formattedTime = dt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      });

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-sans">
                              <Clock className="h-3 w-3 text-zinc-500 shrink-0" />
                              <span className="font-mono text-[11px]">{formattedTime}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-sans">
                            {log.actor_email ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-bold">
                                  {log.actor_email[0].toUpperCase()}
                                </div>
                                <span className="font-medium text-zinc-200 text-xs">
                                  {log.actor_email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic text-[11px] flex items-center gap-1">
                                <User className="h-3 w-3 inline" /> System Service
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>

                          <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-zinc-200 font-sans font-medium">
                                {log.resource_type}
                              </span>
                              {log.resource_id && (
                                <span className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                                  {log.resource_id}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-zinc-400 whitespace-nowrap text-[11px]">
                            {log.ip_address || "—"}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-zinc-400 group-hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                            >
                              Inspect
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
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

      {/* Inspect Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-orange-400" />
              Audit Event Payload
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Immutable event ID: <span className="font-mono text-zinc-300">{selectedLog?.id}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Action</span>
                  <span className="font-mono text-zinc-200 mt-0.5 block">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Timestamp</span>
                  <span className="font-mono text-zinc-200 mt-0.5 block">
                    {new Date(selectedLog.created_at).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Actor</span>
                  <span className="text-zinc-200 mt-0.5 block">
                    {selectedLog.actor_email || "System Service / Anonymous"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Origin IP</span>
                  <span className="font-mono text-zinc-200 mt-0.5 block">
                    {selectedLog.ip_address || "Internal Loopback"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-zinc-400 font-semibold block mb-1 text-[11px]">
                  Event Metadata JSON
                </span>
                <pre className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

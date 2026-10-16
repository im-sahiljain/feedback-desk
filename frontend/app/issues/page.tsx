"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  ClipboardCheck,
  Sparkles,
  ShieldCheck,
  Clock,
  Layers,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { FeedbackDetailModal } from "@/components/feedback/FeedbackDetailModal";

type Issue = {
  priority: string;
  id: string;
  title: string;
  category: string;
  status: string;
  assignee: string | null;
  due_at: string | null;
  resolution_notes: string | null;
  evidence_count: number;
  negative_count: number;
  high_priority_count: number;
  recent_count: number;
  previous_count: number;
  trend: string;
  severity: string;
  evidence_ids: string[];
};

type Evidence = {
  id: string;
  feedback: string;
  created_at: string;
  sentiment_label: string | null;
  priority_label: string | null;
};

const statusOptions = [
  "open",
  "investigating",
  "planned",
  "resolved",
  "dismissed",
];

export default function IssuesPage() {
  const { currentProduct, isBootstrapping, isDemo } = useApp();
  const [days, setDays] = useState(30);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [alerts, setAlerts] = useState<
    { issue_id: string; title: string; reason: string }[]
  >([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [events, setEvents] = useState<
    { event_type: string; created_at: string }[]
  >([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [activeModalFeedbackId, setActiveModalFeedbackId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialFeedback, setModalInitialFeedback] = useState<{
    text?: string;
    sentiment?: any;
    impact?: any;
  } | null>(null);
  const [customers, setCustomers] = useState<
    { customer_token: string; feedback_count: number }[]
  >([]);
  const [privacyEmail, setPrivacyEmail] = useState("");
  const [impact, setImpact] = useState<{
    resolved_at: string | null;
    before_count: number;
    after_count: number;
    before_negative: number;
    after_negative: number;
    after_window_complete: boolean;
    note: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const productId = currentProduct?.id;

  const call = useCallback(
    async (
      path: string,
      method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
      body?: object,
    ) => {
      const qs = path.includes("?") ? "&" : "?";
      const res = await fetch(
        `/api/intelligence/${path}${qs}product_id=${encodeURIComponent(String(productId))}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json.message || json.error || "Request failed");
      return json;
    },
    [productId],
  );

  const inspect = useCallback(
    async (id: string) => {
      setSelected(id);
      setError("");
      try {
        const [a, b] = await Promise.all([
          call(`issues/${id}/evidence`),
          call(`issues/${id}/history`),
        ]);
        setEvidence(a.evidence || []);
        setEvents(b.events || []);
        const c = await call(`issues/${id}/impact?days=${days}`);
        setImpact(c.impact || null);
      } catch (e) {
        setError(String(e));
      }
    },
    [call, days],
  );

  const reload = useCallback(async () => {
    if (!productId) return;
    setError("");
    try {
      const [result, warnings, customerResult] = await Promise.all([
        call(`issues?days=${days}`),
        call(`alerts?days=${days}`),
        call("customers"),
      ]);
      setCustomers(customerResult.customers || []);
      const loadedIssues: Issue[] = result.issues || [];
      setIssues(loadedIssues);
      setAlerts(warnings.alerts || []);

      // If nothing selected or selected issue no longer exists, default to first issue
      if (loadedIssues.length > 0 && (!selected || !loadedIssues.find((i) => i.id === selected))) {
        inspect(loadedIssues[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load intelligence");
    }
  }, [call, days, productId, selected, inspect]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await call("reconcile", "POST");
      setNotice(
        `Clustering complete: ${response.linked} feedback records organized.${
          response.remaining ? " More unprocessed records remain; run again to complete batch." : ""
        }`,
      );
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, field: string, value: string | null) => {
    setBusy(true);
    setError("");
    try {
      await call(`issues/${id}`, "PATCH", { [field]: value });
      await reload();
      if (selected === id) await inspect(id);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const mergeIssue = async () => {
    if (!selected || !mergeTarget || selected === mergeTarget) return;
    setBusy(true);
    try {
      await call(`issues/${selected}/merge`, "POST", {
        target_issue_id: mergeTarget,
      });
      setSelected(mergeTarget);
      setMergeTarget("");
      setNotice("Issue merged successfully; all evidence linked to target issue.");
      await reload();
      await inspect(mergeTarget);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const splitEvidence = async (feedbackId: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      await call(`issues/${selected}/split`, "POST", {
        feedback_id: feedbackId,
      });
      setNotice("Feedback separated into its own new issue.");
      await reload();
      await inspect(selected);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const unlinkIdentity = async () => {
    if (!privacyEmail.trim()) return;
    setBusy(true);
    try {
      await call("customers", "DELETE", { email: privacyEmail });
      setPrivacyEmail("");
      setNotice("Customer data has been successfully disconnected and removed.");
      await reload();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const selectedIssue = issues.find((i) => i.id === selected);

  const openFeedbackModal = (
    id: string,
    fallback?: { text?: string; sentiment?: any; impact?: any },
  ) => {
    setActiveModalFeedbackId(id);
    setModalInitialFeedback(fallback || null);
    setIsModalOpen(true);
  };

  const filteredIssues = issues.filter(
    (i) =>
      i.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      i.severity.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 text-[11px]">Critical</Badge>;
      case "high":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px]">High</Badge>;
      case "medium":
        return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[11px]">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] text-muted-foreground">Low</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend.toLowerCase() === "up" || trend.toLowerCase() === "rising") {
      return (
        <span title="Rising issue">
          <TrendingUp className="h-3 w-3 text-red-500" />
        </span>
      );
    }
    if (trend.toLowerCase() === "down" || trend.toLowerCase() === "declining") {
      return (
        <span title="Declining issue">
          <TrendingDown className="h-3 w-3 text-emerald-500" />
        </span>
      );
    }
    return (
      <span title="Stable trend">
        <Minus className="h-3 w-3 text-muted-foreground" />
      </span>
    );
  };

  return (
    <AppLayout
      title="Customer Issues & Fixes"
      description="Automatically groups customer complaints into clear issues, catches urgent problems, and tracks fixes from start to finish."
    >
      <div className="flex-1 w-full px-4 pb-12 md:px-7 space-y-6">
        {!productId ? (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-muted-foreground text-sm">
              {isBootstrapping
                ? "Loading product workspace…"
                : "Select a product from the sidebar to view issues."}
            </p>
          </div>
        ) : (
          <>
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Time Range:</span>
                  <select
                    id="issue-period"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-background px-2.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>

                <div className="h-4 w-px bg-border hidden sm:block" />

                <Button
                  onClick={refresh}
                  disabled={busy || isDemo}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  title="Uses AI to scan all customer feedback and group similar complaints together"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                  Group Similar Feedback
                </Button>

                <span className="text-[11px] text-muted-foreground hidden lg:inline">
                  AI automatically groups matching feedback together so you see real problem patterns instead of individual messages
                </span>
              </div>

              {/* Link to Dedicated Chat Copilot Page */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link href="/chat">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shadow-xs">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Ask AI Copilot
                  </Button>
                </Link>
              </div>
            </div>

            {/* Error or Notice Banners */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError("")} className="hover:opacity-70">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {notice && (
              <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="flex-1">{notice}</span>
                <button onClick={() => setNotice("")} className="hover:opacity-70">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Attention Signals Banner */}
            {alerts.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">
                      Urgent Complaints Needing Attention ({alerts.length})
                    </h3>
                  </div>
                  <Link
                    href="/settings"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                  >
                    <SettingsIcon className="h-3 w-3" />
                    Set up email alerts in Settings
                  </Link>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {alerts.slice(0, 6).map((a) => (
                    <button
                      key={a.issue_id}
                      onClick={() => void inspect(a.issue_id)}
                      className="flex items-start gap-2 p-2.5 rounded-lg border border-border/60 bg-background/80 hover:bg-background hover:border-primary/50 text-left transition-colors shadow-xs"
                    >
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        {a.reason}
                      </span>
                      <span className="text-xs font-medium text-foreground truncate">
                        {a.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Issues Workspace: Full Width Master-Detail */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Tracked Issues List (5 cols on XL) */}
              <Card className="xl:col-span-5 shadow-sm border-border flex flex-col h-[720px]">
                <CardHeader className="pb-3 border-b border-border/50 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">Tracked Issues ({issues.length})</CardTitle>
                    </div>
                  </div>
                  <div className="pt-2">
                    <Input
                      placeholder="Search by issue title, category, or priority..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-3 overflow-y-auto flex-1 space-y-2">
                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-2 text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto opacity-30" />
                      <p className="text-xs">
                        {issues.length === 0
                          ? "No customer issues created yet. Click 'Group Similar Feedback' above to organize your customer comments into issues."
                          : "No issues match your search criteria."}
                      </p>
                    </div>
                  ) : (
                    filteredIssues.map((issue) => {
                      const isCurrent = selected === issue.id;
                      return (
                        <button
                          key={issue.id}
                          onClick={() => void inspect(issue.id)}
                          className={`w-full text-left rounded-lg p-3 transition-all border text-xs space-y-2 ${
                            isCurrent
                              ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                              : "border-border/60 hover:border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                              {issue.title}
                            </h4>
                            {getSeverityBadge(issue.severity)}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <MessageSquare className="h-3 w-3 text-primary" />
                              {issue.evidence_count} {issue.evidence_count === 1 ? "comment" : "comments"}
                            </span>
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                              {issue.category}
                            </Badge>
                            <span>•</span>
                            <span className="capitalize">{issue.status}</span>
                            <span className="ml-auto flex items-center gap-1">
                              {getTrendIcon(issue.trend)}
                              <span className="text-[10px] capitalize">{issue.trend}</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-1 border-t border-border/40">
                            <span>
                              This period: <b className="text-foreground">{issue.recent_count}</b> new vs {issue.previous_count} prior
                            </span>
                            {issue.negative_count > 0 && (
                              <span className="text-red-500 font-medium">
                                {issue.negative_count} unhappy
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Investigation & Action (7 cols on XL) */}
              <Card className="xl:col-span-7 shadow-sm border-border flex flex-col h-[720px]">
                <CardHeader className="pb-3 border-b border-border/50 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">Issue Details & Action Plan</CardTitle>
                    </div>
                    {selectedIssue && (
                      <Badge variant="outline" className="text-xs">
                        {selectedIssue.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
                  {!selectedIssue ? (
                    <div className="text-center py-16 px-4 space-y-2 text-muted-foreground">
                      <ClipboardCheck className="h-8 w-8 mx-auto opacity-30" />
                      <p>Select an issue on the left to review customer feedback, assign a team member, and record your fix.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-bold text-foreground tracking-tight">
                          {selectedIssue.title}
                        </h3>
                      </div>

                      {/* Quick Metadata Controls */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-muted/20 border border-border/50">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                            Urgency / Priority
                          </label>
                          <select
                            className="w-full h-8 rounded border border-border bg-background px-2 text-xs font-medium"
                            disabled={busy || isDemo}
                            value={selectedIssue.priority || "medium"}
                            onChange={(e) => void update(selectedIssue.id, "priority", e.target.value)}
                          >
                            {["low", "medium", "high", "critical"].map((p) => (
                              <option key={p} value={p}>{p.toUpperCase()}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                            Status
                          </label>
                          <select
                            disabled={busy || isDemo}
                            className="w-full h-8 rounded border border-border bg-background px-2 text-xs font-medium capitalize"
                            value={selectedIssue.status}
                            onChange={(e) => void update(selectedIssue.id, "status", e.target.value)}
                          >
                            {statusOptions.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                            Assigned To
                          </label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Team member or owner"
                            defaultValue={selectedIssue.assignee || ""}
                            key={selectedIssue.id + "assignee"}
                            disabled={busy || isDemo}
                            onBlur={(e) => {
                              if (e.target.value !== (selectedIssue.assignee || "")) {
                                void update(selectedIssue.id, "assignee", e.target.value || null);
                              }
                            }}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground block mb-1">
                            Target Fix Date
                          </label>
                          <Input
                            className="h-8 text-xs"
                            type="date"
                            defaultValue={selectedIssue.due_at?.slice(0, 10) || ""}
                            key={selectedIssue.id + "due"}
                            disabled={busy || isDemo}
                            onBlur={(e) => {
                              const old = selectedIssue.due_at?.slice(0, 10) || "";
                              if (e.target.value !== old) {
                                void update(
                                  selectedIssue.id,
                                  "due_at",
                                  e.target.value
                                    ? new Date(e.target.value + "T12:00:00Z").toISOString()
                                    : null,
                                );
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Fix Notes & Next Steps
                        </label>
                        <Textarea
                          className="text-xs resize-none"
                          rows={2}
                          placeholder="Notes on what caused this, steps your team is taking to fix it, or relevant links..."
                          defaultValue={selectedIssue.resolution_notes || ""}
                          key={selectedIssue.id + "notes"}
                          disabled={busy || isDemo}
                          onBlur={(e) => {
                            if (e.target.value !== (selectedIssue.resolution_notes || "")) {
                              void update(selectedIssue.id, "resolution_notes", e.target.value || null);
                            }
                          }}
                        />
                      </div>

                      {/* Observational Impact Card (if resolved) */}
                      {impact?.resolved_at !== undefined && (
                        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Results After Fix
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            Before fix: <b>{impact.before_count}</b> customer complaints ({impact.before_negative} unhappy) → After fix: <b>{impact.after_count}</b> complaints ({impact.after_negative} unhappy).
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {impact.after_window_complete ? "Full follow-up period complete." : "Still gathering customer feedback to measure results."} {impact.note}
                          </p>
                        </div>
                      )}

                      {/* Combine / Merge Control */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-muted/10">
                        <span className="text-[11px] text-muted-foreground shrink-0">Combine with:</span>
                        <select
                          aria-label="Combine with another issue"
                          className="w-full sm:flex-1 h-8 border border-border rounded bg-background text-xs px-2"
                          value={mergeTarget}
                          onChange={(e) => setMergeTarget(e.target.value)}
                        >
                          <option value="">Select an existing issue to combine this with…</option>
                          {issues
                            .filter((i) => i.id !== selectedIssue.id)
                            .map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.title.slice(0, 60)} ({i.evidence_count} comments)
                              </option>
                            ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs shrink-0"
                          disabled={busy || isDemo || !mergeTarget}
                          onClick={mergeIssue}
                        >
                          Combine Issues
                        </Button>
                      </div>

                      {/* Supporting Evidence List */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-xs">
                            Customer Feedback Quotes ({evidence.length})
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Click any quote to view full customer details
                          </span>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {evidence.length === 0 ? (
                            <p className="text-muted-foreground py-4 text-center">No customer feedback linked to this issue yet.</p>
                          ) : (
                            evidence.map((f) => (
                              <div
                                key={f.id}
                                className="border border-border/60 rounded-lg p-2.5 text-xs hover:border-primary/50 bg-card hover:bg-muted/30 transition-all cursor-pointer space-y-1.5 shadow-xs"
                                onClick={() =>
                                  openFeedbackModal(f.id, {
                                    text: f.feedback,
                                    sentiment: f.sentiment_label,
                                    impact: f.priority_label,
                                  })
                                }
                              >
                                <p className="text-foreground leading-relaxed italic">
                                  “{f.feedback}”
                                </p>
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <span>{new Date(f.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                                      {f.sentiment_label || "Unclassified"}
                                    </Badge>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                                      {f.priority_label || "Normal"}
                                    </Badge>
                                  </div>
                                  <div
                                    className="flex items-center gap-2.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      className="text-primary hover:underline font-medium text-[11px]"
                                      onClick={() =>
                                        openFeedbackModal(f.id, {
                                          text: f.feedback,
                                          sentiment: f.sentiment_label,
                                          impact: f.priority_label,
                                        })
                                      }
                                    >
                                      View details
                                    </button>
                                    <Link
                                      className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-0.5 text-[11px]"
                                      href={`/feedback?ids=${encodeURIComponent(f.id)}&product_id=${encodeURIComponent(String(productId))}`}
                                    >
                                      Inbox <ExternalLink className="h-2.5 w-2.5" />
                                    </Link>
                                    <button
                                      disabled={busy || isDemo}
                                      className="text-muted-foreground hover:text-destructive hover:underline text-[11px]"
                                      onClick={() => void splitEvidence(f.id)}
                                      title="Move this feedback into its own separate issue"
                                    >
                                      Split Out
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Activity History */}
                      {events.length > 0 && (
                        <div className="pt-2 border-t border-border/40 space-y-1.5">
                          <span className="font-semibold text-foreground text-[11px] block">
                            Recent Activity
                          </span>
                          <div className="space-y-1">
                            {events.slice(0, 4).map((e, index) => (
                              <div key={index} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3 shrink-0" />
                                <span>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:</span>
                                <span className="text-foreground">{e.event_type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Simplified Customer Privacy & Data Erasure (GDPR / CCPA) Card */}
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Customer Privacy & Data Removal (GDPR / CCPA)</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {customers.length} protected customer IDs
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  Customer feedback is stored with privacy protection so comments are separated from personal emails. If a customer asks to delete their data, enter their email below to permanently disconnect their feedback history.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
                  <Input
                    type="email"
                    aria-label="Customer email to remove"
                    placeholder="customer@example.com"
                    value={privacyEmail}
                    disabled={isDemo || busy}
                    onChange={(e) => setPrivacyEmail(e.target.value)}
                    className="text-xs h-9"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDemo || busy || !privacyEmail.trim()}
                    onClick={unlinkIdentity}
                    className="text-xs h-9 shrink-0"
                  >
                    Remove Customer Data
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This permanently disconnects the customer's email and removes personal links from past feedback while keeping your overall business trends accurate.
                </p>
              </CardContent>
            </Card>

            {/* Dynamic Single-Feedback Detail Modal */}
            <FeedbackDetailModal
              feedbackId={activeModalFeedbackId}
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialFeedback={modalInitialFeedback}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}

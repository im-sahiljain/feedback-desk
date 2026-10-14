"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Search, Sparkles, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";

export default function AdminFeedbacksPage() {
  const { user, isBootstrapping } = useApp();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbacksData, setFeedbacksData] = useState<any>({ feedbacks: [], pagination: {} });
  const [feedbackSearch, setFeedbackSearch] = useState<string>("");
  const [feedbackSentiment, setFeedbackSentiment] = useState<string>("all");
  const [feedbackStatus, setFeedbackStatus] = useState<string>("all");
  const [feedbackPriority, setFeedbackPriority] = useState<string>("all");

  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [triageStatus, setTriageStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState<boolean>(false);

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

  const loadFeedbacks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.admin.getFeedbacks({
        search: feedbackSearch || undefined,
        sentiment: feedbackSentiment !== "all" ? feedbackSentiment : undefined,
        status: feedbackStatus !== "all" ? feedbackStatus : undefined,
        priority: feedbackPriority !== "all" ? feedbackPriority : undefined,
        limit: 20,
      });
      setFeedbacksData(res);
    } catch (err) {
      console.error("Failed to load feedbacks", err);
    } finally {
      setIsLoading(false);
    }
  }, [feedbackSearch, feedbackSentiment, feedbackStatus, feedbackPriority]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadFeedbacks();
    }
  }, [user, loadFeedbacks]);

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;
    setIsUpdatingFeedback(true);
    try {
      await api.admin.updateFeedback(selectedFeedback.id, {
        status: triageStatus,
        adminNotes: adminNotes,
      });
      toast({
        title: "Triage Updated",
        description: `Feedback status set to ${triageStatus}`,
      });
      setSelectedFeedback(null);
      loadFeedbacks();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "Could not update feedback item",
      });
    } finally {
      setIsUpdatingFeedback(false);
    }
  };

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
      title="Platform Feedback Stream"
      description="Cross-tenant triage stream, Gemini root-cause insights & administrative status resolution"
      activeTab="feedbacks"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={loadFeedbacks}
          disabled={isLoading}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border/60">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search feedback, email, product..."
              value={feedbackSearch}
              onChange={(e) => setFeedbackSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadFeedbacks()}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select value={feedbackSentiment} onValueChange={(val) => setFeedbackSentiment(val)}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            <Select value={feedbackStatus} onValueChange={(val) => setFeedbackStatus(val)}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={feedbackPriority} onValueChange={(val) => setFeedbackPriority(val)}>
              <SelectTrigger className="h-9 w-28 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="P0">P0 Urgent</SelectItem>
                <SelectItem value="P1">P1 High</SelectItem>
                <SelectItem value="P2">P2 Medium</SelectItem>
                <SelectItem value="P3">P3 Low</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={loadFeedbacks} className="h-9 text-xs">
              Filter
            </Button>
          </div>
        </div>

        {/* Feedbacks Stream Table */}
        <Card className="border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="p-3 font-semibold">Tenant Product</th>
                  <th className="p-3 font-semibold">Rating & Review</th>
                  <th className="p-3 font-semibold">AI Sentiment</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Priority</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {feedbacksData?.feedbacks && feedbacksData.feedbacks.length > 0 ? (
                  feedbacksData.feedbacks.map((item: any) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedFeedback(item);
                        setTriageStatus(item.status || "received");
                        setAdminNotes(item.admin_notes || "");
                      }}
                    >
                      <td className="p-3 font-medium text-foreground whitespace-nowrap">
                        {item.product_name || "Platform App"}
                      </td>
                      <td className="p-3 max-w-xs truncate">
                        <div className="flex items-center gap-1.5 font-bold text-amber-500 mb-0.5">
                          {item.rating ? `${item.rating} ★` : "No rating"}
                        </div>
                        <span className="text-muted-foreground truncate block">{item.text}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            item.sentiment?.toLowerCase() === "positive"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px]"
                              : item.sentiment?.toLowerCase() === "negative"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/30 text-[10px]"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]"
                          }
                        >
                          {item.sentiment?.toUpperCase() || "NEUTRAL"}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {item.category || "General"}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            item.priority?.toUpperCase() === "P0"
                              ? "bg-rose-500 text-white font-mono text-[10px]"
                              : "text-muted-foreground font-mono text-[10px]"
                          }
                        >
                          {item.priority || "P2"}
                        </Badge>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                          {item.status || "received"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Inspect →
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">
                      No feedback items match the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* INSPECT & TRIAGE DRAWER */}
      <Sheet open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6 space-y-5">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">Feedback Item Inspection</SheetTitle>
            <SheetDescription className="text-xs">
              Gemini root-cause intelligence, tenant attribution & administrative triage
            </SheetDescription>
          </SheetHeader>

          {selectedFeedback && (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">
                    {selectedFeedback.product_name || "Platform App"}
                  </span>
                  <Badge variant="outline">{selectedFeedback.rating ? `${selectedFeedback.rating} ★` : "No rating"}</Badge>
                </div>
                <p className="text-foreground leading-relaxed">{selectedFeedback.text}</p>
                {selectedFeedback.customer_email && (
                  <p className="text-muted-foreground text-[11px]">From: {selectedFeedback.customer_email}</p>
                )}
              </div>

              {/* Gemini Insights */}
              {selectedFeedback.raw_ai_metadata && (
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-orange-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Gemini Root-Cause Intelligence</span>
                  </div>
                  {selectedFeedback.raw_ai_metadata.root_cause && (
                    <p className="text-zinc-300">
                      <strong>Root Cause:</strong> {selectedFeedback.raw_ai_metadata.root_cause}
                    </p>
                  )}
                  {selectedFeedback.raw_ai_metadata.action_items && (
                    <div>
                      <strong className="text-zinc-300">Suggested Action Items:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-400">
                        {selectedFeedback.raw_ai_metadata.action_items.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Triage Status Control */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <label className="font-semibold text-foreground">Triage Status</label>
                <Select value={triageStatus} onValueChange={setTriageStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Internal Admin Notes */}
              <div className="space-y-2">
                <label className="font-semibold text-foreground">Internal Admin Notes</label>
                <Textarea
                  placeholder="Record internal resolution notes, investigations or root causes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
              </div>

              <Button
                onClick={handleUpdateFeedback}
                disabled={isUpdatingFeedback}
                className="w-full h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white mt-4"
              >
                {isUpdatingFeedback ? "Saving..." : "Save Triage Changes"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}

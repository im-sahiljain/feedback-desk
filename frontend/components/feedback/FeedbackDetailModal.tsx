"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Star, Mail } from "lucide-react";
import { Feedback } from "@/types";
import { normalizeBackendFeedback } from "@/lib/normalization";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FeedbackDetailModalProps {
  feedbackId: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialFeedback?: Partial<Feedback> | null;
}

function sentimentTextClass(sentiment?: string) {
  switch (sentiment) {
    case "positive":
      return "text-emerald-600 dark:text-emerald-400";
    case "negative":
      return "text-red-600 dark:text-red-400";
    case "neutral":
      return "text-amber-600 dark:text-amber-400";
    case "mixed":
      return "text-violet-600 dark:text-violet-400";
    default:
      return "text-muted-foreground";
  }
}

function priorityTextClass(priority?: string) {
  switch (priority) {
    case "critical":
      return "text-red-700 dark:text-red-300";
    case "high":
    case "immediate":
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-amber-700 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function MetaPill({
  label,
  value,
  valueClassName,
  capitalize = true,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md bg-muted/50 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate text-sm font-medium",
          capitalize && "capitalize",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatChipList(items?: string[]) {
  return (items || []).filter(
    (s) => typeof s === "string" && s.trim().length > 0,
  );
}

function AnalysisChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
        {label}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={`${label}-${item}`}
            className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-2.5 py-1 text-xs capitalize text-foreground"
          >
            {item.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

export function FeedbackDetailModal({
  feedbackId,
  isOpen,
  onClose,
  initialFeedback,
}: FeedbackDetailModalProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !feedbackId) {
      setFeedback(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    async function loadFeedback() {
      try {
        const res = await fetch(
          `/api/feedbacks/${encodeURIComponent(feedbackId!)}`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data.message || data.error || "Failed to load feedback details",
          );
        }
        if (!isCancelled && data.item) {
          setFeedback(normalizeBackendFeedback(data.item));
        }
      } catch (err) {
        if (!isCancelled) {
          if (initialFeedback && initialFeedback.text) {
            setFeedback({
              id: feedbackId!,
              productId: initialFeedback.productId || "",
              text: initialFeedback.text || "",
              rating: initialFeedback.rating || 0,
              email: initialFeedback.email,
              createdAt: initialFeedback.createdAt || new Date(),
              categories: initialFeedback.categories || ["General"],
              category: initialFeedback.category || "General",
              sentiment: initialFeedback.sentiment || "neutral",
              impact: initialFeedback.impact || "medium",
              status: initialFeedback.status || "new",
              analysis: initialFeedback.analysis,
              isAnalyzing: false,
            });
          } else {
            setError(
              err instanceof Error ? err.message : "Error loading feedback",
            );
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadFeedback();

    return () => {
      isCancelled = true;
    };
  }, [feedbackId, isOpen, initialFeedback]);

  const analysis = feedback?.analysis;
  const primaryCategory =
    feedback?.category ||
    analysis?.category ||
    feedback?.categories?.[0] ||
    null;

  const allCategories = (() => {
    const fromFb = feedback?.categories?.length
      ? feedback.categories
      : analysis?.categories?.length
        ? analysis.categories
        : [];
    const merged = [...fromFb];
    if (primaryCategory && !merged.includes(primaryCategory)) {
      merged.unshift(primaryCategory);
    }
    return [...new Set(merged.filter(Boolean))];
  })();

  const secondaryCategories = allCategories.filter(
    (c) => c !== primaryCategory,
  );

  const severity =
    analysis?.severity && analysis.severity !== "none"
      ? analysis.severity
      : null;

  const urgency =
    analysis?.urgency && analysis.urgency !== "none" ? analysis.urgency : null;

  const hypotheses =
    analysis?.rootCauseHypotheses && analysis.rootCauseHypotheses.length > 0
      ? analysis.rootCauseHypotheses
      : analysis?.rootCause
        ? [
            {
              hypothesis: analysis.rootCause,
              confidence: "medium",
              evidence: [],
            },
          ]
        : [];

  const intents = formatChipList(analysis?.intents);
  const topics = formatChipList(analysis?.topics);
  const capabilities = formatChipList(analysis?.requestedCapabilities);
  const praise = formatChipList(analysis?.positiveAttributes);
  const issues = analysis?.issues || [];

  const hasAnalysis =
    !!analysis &&
    !feedback?.isAnalyzing &&
    !!(
      analysis.aspects?.length ||
      hypotheses.length ||
      analysis.actionItems?.length ||
      intents.length ||
      topics.length ||
      issues.length ||
      capabilities.length ||
      praise.length
    );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center pr-6">
            <span>Customer Feedback Details</span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>Loading feedback details…</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {!loading && feedback && (
          <div className="space-y-6 pt-2">
            {/* MetaPills row: Sentiment, Priority, Severity, Urgency, Received */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <MetaPill
                label="Sentiment"
                value={analysis?.sentiment || feedback.sentiment || "Unknown"}
                valueClassName={sentimentTextClass(
                  analysis?.sentiment || feedback.sentiment,
                )}
              />
              <MetaPill
                label="Priority"
                value={
                  analysis?.priority
                    ? `${analysis.priority} priority`
                    : `${feedback.impact || "medium"} priority`
                }
                valueClassName={priorityTextClass(
                  analysis?.priority || feedback.impact,
                )}
              />
              {severity && (
                <MetaPill
                  label="Severity"
                  value={severity}
                  valueClassName={priorityTextClass(severity)}
                />
              )}
              {urgency && (
                <MetaPill
                  label="Urgency"
                  value={urgency}
                  valueClassName={priorityTextClass(urgency)}
                />
              )}
              <MetaPill
                label="Received"
                value={new Date(feedback.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                capitalize={false}
              />
            </div>

            {/* Customer Feedback Text */}
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1.5">
                Feedback text
              </p>
              <div className="rounded-lg border bg-muted/20 p-3.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {feedback.text}
              </div>
            </div>

            {/* Categories */}
            {allCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                  Categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {primaryCategory && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      {primaryCategory}
                      <span className="text-[10px] text-muted-foreground">
                        (Primary)
                      </span>
                    </Badge>
                  )}
                  {secondaryCategories.map((c) => (
                    <Badge key={c} variant="outline" className="font-normal">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {analysis?.summary && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <p className="text-xs font-semibold text-primary mb-1">
                  AI Summary
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {analysis.summary}
                </p>
              </div>
            )}

            {/* Full Analysis Sections */}
            {hasAnalysis && (
              <div className="space-y-5 border-t border-border/50 pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">
                    Deep AI Analysis
                  </h3>
                </div>

                {/* Intent & Topics */}
                <AnalysisChipRow label="Intent" items={intents} />
                <AnalysisChipRow label="Topics" items={topics} />

                {/* Specific Issues */}
                {issues.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                      Specific Issues
                    </h3>
                    <ul className="divide-y divide-border/50 border border-border/60 rounded-lg overflow-hidden bg-muted/10">
                      {issues.map((issue, idx) => (
                        <li key={idx} className="p-3">
                          <p className="text-sm font-medium text-foreground">
                            {issue.issue || issue.description}
                          </p>
                          {issue.topic && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Topic: {issue.topic}
                            </p>
                          )}
                          {issue.evidence && issue.evidence.length > 0 && (
                            <p className="mt-1 text-xs italic text-muted-foreground">
                              “{issue.evidence[0]}”
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Requested Capabilities & Praise */}
                <AnalysisChipRow
                  label="Requested capabilities"
                  items={capabilities}
                />
                <AnalysisChipRow label="Praise & Positive Attributes" items={praise} />

                {/* Aspect Breakdown */}
                {analysis?.aspects && analysis.aspects.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                      Aspect Breakdown
                    </h3>
                    <ul className="divide-y divide-border/50 border border-border/60 rounded-lg overflow-hidden bg-muted/10">
                      {analysis.aspects.map((asp, idx) => {
                        const tone = asp.sentiment
                          ?.toLowerCase()
                          .includes("pos")
                          ? "positive"
                          : asp.sentiment?.toLowerCase().includes("neg")
                            ? "negative"
                            : asp.sentiment?.toLowerCase().includes("mix")
                              ? "mixed"
                              : "neutral";
                        const detail = asp.observation || asp.snippet;
                        const quote = asp.evidence || asp.snippet;
                        const aspSeverity =
                          asp.severity &&
                          !["none", "None"].includes(asp.severity)
                            ? asp.severity
                            : null;

                        return (
                          <li key={idx} className="p-3 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {asp.category}
                              </span>
                              {aspSeverity && (
                                <span className="text-xs capitalize font-medium text-amber-600 dark:text-amber-400">
                                  {aspSeverity} severity
                                </span>
                              )}
                              {asp.sentiment && (
                                <span
                                  className={cn(
                                    "text-xs capitalize font-medium",
                                    sentimentTextClass(tone),
                                  )}
                                >
                                  {asp.sentiment}
                                </span>
                              )}
                            </div>
                            {detail && (
                              <p className="text-sm leading-relaxed text-foreground">
                                {detail}
                              </p>
                            )}
                            {quote && quote !== detail && (
                              <p className="text-xs italic text-muted-foreground">
                                “{quote}”
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {/* Likely Cause / Root Cause Hypotheses */}
                {hypotheses.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                      Likely Cause (Root Cause)
                    </h3>
                    <ul className="space-y-2 border border-border/60 rounded-lg p-3 bg-muted/10">
                      {hypotheses.map((h, i) => (
                        <li key={i} className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {h.hypothesis}
                          </p>
                          {h.confidence && (
                            <p className="text-xs text-muted-foreground">
                              Confidence:{" "}
                              <span className="capitalize font-semibold text-foreground">
                                {h.confidence}
                              </span>
                            </p>
                          )}
                          {"evidence" in h &&
                            Array.isArray(h.evidence) &&
                            h.evidence.length > 0 && (
                              <p className="text-xs italic text-muted-foreground">
                                “{h.evidence[0]}”
                              </p>
                            )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Suggested Next Steps / Action Items */}
                {analysis?.actionItems && analysis.actionItems.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                      Suggested Next Steps
                    </h3>
                    <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
                      {analysis.actionItems.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            )}

            {/* Footer with rating and email */}
            {(feedback.rating || feedback.email) && (
              <div className="flex flex-wrap items-center gap-4 border-t border-border/50 pt-3.5 text-xs text-muted-foreground">
                {feedback.rating ? (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    Rating: {feedback.rating}/5
                  </span>
                ) : null}
                {feedback.email ? (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {feedback.email}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

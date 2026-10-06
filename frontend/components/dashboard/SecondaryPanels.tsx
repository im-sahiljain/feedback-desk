"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  feedbackFilterHref,
  formatPositiveChangeTone,
  relativeTimeLabel,
} from "@/lib/dashboard";
import type { DashboardSummary } from "@/types";
import { ArrowRight, ThumbsUp } from "lucide-react";

export function PositiveSignalsPanel({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-base">What&apos;s going well</CardTitle>
        </div>
        <CardDescription>Positive signals worth preserving</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.positiveSignals.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No positive signals identified for this period yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.positiveSignals.map((signal) => (
              <li key={signal.category}>
                <Link
                  href={feedbackFilterHref({
                    category: signal.category,
                    sentiment: "positive",
                  })}
                  className="block rounded-lg border px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <p className="text-sm font-medium">{signal.category}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {signal.positiveCount} positive feedback items
                    {signal.change.direction !== "flat" ? (
                      <span className={`ml-2 ${formatPositiveChangeTone(signal.change)}`}>
                        {signal.change.display}
                      </span>
                    ) : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CriticalFeedbackPanel({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Recent feedback requiring attention</CardTitle>
            <CardDescription>High-priority, failed, or elevated negative items</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
            <Link href={feedbackFilterHref({ priority: "high" })}>
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.criticalFeedback.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No urgent feedback needs attention.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {data.criticalFeedback.map((item) => (
              <li key={item.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.priority && (
                    <Badge
                      variant={
                        item.priority.toLowerCase().includes("high")
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px] uppercase"
                    >
                      {item.priority}
                    </Badge>
                  )}
                  {item.sentiment && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {item.sentiment}
                    </Badge>
                  )}
                  {item.processingStatus === "failed" && (
                    <Badge variant="destructive" className="text-[10px]">
                      Analysis failed
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed line-clamp-2">{item.text}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {item.category || "General"} · {relativeTimeLabel(item.createdAt)}
                  </span>
                  <Link
                    href={`/feedback?highlight=${encodeURIComponent(item.id)}`}
                    className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                  >
                    View feedback
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ProcessingStatusPanel({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  if (loading && !data) return null;
  if (!data) return null;

  const { processing } = data.summary;
  const show =
    processing.pending > 0 || processing.failed > 0 || processing.received > 0;
  if (!show) return null;

  // Keep non-dominant: only surface when incomplete/failed, or as quiet footer when data exists
  if (processing.pending === 0 && processing.failed === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Feedback processing · {processing.received} received · {processing.analyzed}{" "}
        analyzed
      </p>
    );
  }

  return (
    <Card className="border-border/70 bg-muted/20 shadow-none">
      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Feedback processing</p>
          <p className="text-xs text-muted-foreground">
            {processing.received} received · {processing.analyzed} analyzed ·{" "}
            {processing.pending} processing
            {processing.failed > 0 ? ` · ${processing.failed} failed` : ""}
          </p>
        </div>
        {processing.failed > 0 && (
          <Button asChild size="sm" variant="outline">
            <Link href={feedbackFilterHref({ status: "failed" })}>Review</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

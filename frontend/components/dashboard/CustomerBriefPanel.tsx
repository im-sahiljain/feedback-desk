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
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackFilterHref, insightsHref } from "@/lib/dashboard";
import type { DashboardPeriod, DashboardSummary } from "@/types";
import { ArrowRight, Sparkles } from "lucide-react";

export function CustomerBriefPanel({
  data,
  loading,
  period,
  error,
  onRetry,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  period: DashboardPeriod;
  error?: string | null;
  onRetry?: () => void;
}) {
  const brief = data?.brief;

  return (
    <Card className="border-border shadow-sm lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">AI Customer Brief</CardTitle>
        </div>
        <CardDescription>
          Concise intelligence from your saved executive brief
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-lg border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium">Executive brief unavailable</p>
            <p className="text-xs text-muted-foreground">
              Core metrics are still available. Try again or generate a brief in
              Insights.
            </p>
            <div className="flex justify-center gap-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              )}
              <Button asChild size="sm">
                <Link href={insightsHref({ period })}>Open Insights</Link>
              </Button>
            </div>
          </div>
        ) : !brief?.available ? (
          <div className="space-y-3 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm font-medium">
              No customer brief for this period yet
            </p>
            <p className="text-xs text-muted-foreground">
              Generate a brief in Insights.
            </p>
            <Button asChild size="sm" className="gap-1.5">
              <Link href={insightsHref({ period })}>
                Generate in Insights
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                What is happening
              </h3>
              <p className="text-sm leading-relaxed">
                {brief.whatIsHappening || brief.headline}
              </p>
            </section>
            {brief.whyItMatters && (
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why it matters
                </h3>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {brief.whyItMatters}
                </p>
              </section>
            )}
            {brief.recommendedFocus && (
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recommended focus
                </h3>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {brief.recommendedFocus}
                </p>
              </section>
            )}
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link
                href={feedbackFilterHref({
                  category: brief.supportingCategory || undefined,
                  sentiment: brief.supportingCategory ? "negative" : undefined,
                  priority: brief.supportingCategory ? undefined : "high",
                })}
              >
                View supporting feedback
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

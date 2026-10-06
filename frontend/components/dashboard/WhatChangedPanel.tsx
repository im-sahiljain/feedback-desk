"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackFilterHref, insightsHref } from "@/lib/dashboard";
import type { DashboardPeriod, DashboardSummary } from "@/types";
import { ArrowDownRight, ArrowUpRight, GitCompareArrows } from "lucide-react";

export function WhatChangedPanel({
  data,
  loading,
  period,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  period: DashboardPeriod;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">What changed</CardTitle>
        </div>
        <CardDescription>
          Meaningful differences vs the previous {period === "7d" ? "7" : period === "30d" ? "30" : "90"} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.changes.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No significant customer feedback changes this period.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.changes.map((change) => {
              const href = change.category
                ? feedbackFilterHref({ category: change.category })
                : insightsHref({ period });
              return (
                <li key={change.id}>
                  <Link
                    href={href}
                    className="flex items-start gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={`mt-0.5 rounded-md p-1 ${
                        change.direction === "up"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                      aria-hidden
                    >
                      {change.direction === "up" ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-medium leading-snug">
                        {change.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {change.detail}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

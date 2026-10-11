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
import {
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Bug,
  Zap,
  Layout,
  CreditCard,
  Headphones,
  Sparkles,
  ArrowRight,
} from "lucide-react";

function getChangeIconAndStyle(change: {
  id: string;
  label: string;
  category?: string;
  direction: "up" | "down";
}) {
  const labelLower = change.label.toLowerCase();
  const catLower = (change.category || "").toLowerCase();

  if (catLower.includes("bug") || labelLower.includes("bug")) {
    return {
      icon: <Bug className="h-3.5 w-3.5" />,
      className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    };
  }

  if (
    catLower.includes("performance") ||
    labelLower.includes("performance") ||
    labelLower.includes("latency") ||
    labelLower.includes("slow")
  ) {
    return {
      icon: <Zap className="h-3.5 w-3.5" />,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
  }

  if (
    catLower.includes("ui") ||
    catLower.includes("ux") ||
    labelLower.includes("ui/ux") ||
    labelLower.includes("design")
  ) {
    return {
      icon: <Layout className="h-3.5 w-3.5" />,
      className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    };
  }

  if (
    catLower.includes("pricing") ||
    catLower.includes("billing") ||
    labelLower.includes("pricing") ||
    labelLower.includes("charged") ||
    labelLower.includes("cost")
  ) {
    return {
      icon: <CreditCard className="h-3.5 w-3.5" />,
      className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    };
  }

  if (
    catLower.includes("support") ||
    labelLower.includes("support") ||
    labelLower.includes("ticket")
  ) {
    return {
      icon: <Headphones className="h-3.5 w-3.5" />,
      className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    };
  }

  if (change.id.startsWith("cat-pos-") || labelLower.includes("positive")) {
    return {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    };
  }

  if (change.id === "negative" || labelLower.includes("negative feedback")) {
    return {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    };
  }

  if (change.id === "volume" || labelLower.includes("volume")) {
    return {
      icon:
        change.direction === "up" ? (
          <TrendingUp className="h-3.5 w-3.5" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5" />
        ),
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };
  }

  return {
    icon:
      change.direction === "up" ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      ),
    className:
      change.direction === "up"
        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
}

export function WhatChangedPanel({
  data,
  loading,
  period,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  period: DashboardPeriod;
}) {
  const daysText =
    period === "7d" ? "7 days" : period === "30d" ? "30 days" : "90 days";

  return (
    <Card className="border-border shadow-sm flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <CardTitle className="text-base">
            What changed (in the last {daysText})
          </CardTitle>
        </div>
        <CardDescription>
          Meaningful differences vs the previous{" "}
          {period === "7d" ? "7" : period === "30d" ? "30" : "90"} days
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
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
          <ul className="space-y-2.5">
            {data.changes.map((change) => {
              const href = change.category
                ? feedbackFilterHref({ category: change.category })
                : insightsHref({ period });
              const style = getChangeIconAndStyle(change);

              return (
                <li
                  key={change.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`mt-0.5 rounded-md p-1.5 shrink-0 ${style.className}`}
                      aria-hidden
                    >
                      {style.icon}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-medium leading-snug text-foreground">
                        {change.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {change.detail}
                      </span>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 gap-1 hover:bg-background border border-transparent hover:border-border"
                  >
                    <Link href={href}>
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

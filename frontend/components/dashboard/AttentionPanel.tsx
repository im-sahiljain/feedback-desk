"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  feedbackFilterHref,
  formatChangeTone,
  insightsHref,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import type { DashboardPeriod, DashboardSummary } from "@/types";
import { ArrowRight, ShieldAlert } from "lucide-react";

function severityBadgeClass(
  severity: DashboardSummary["attention"][number]["severity"],
) {
  switch (severity) {
    case "high":
      return "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80";
    case "medium":
      return "border-transparent bg-warning text-warning-foreground hover:bg-warning/80";
    case "watch":
      return "border-transparent bg-info text-info-foreground hover:bg-info/80";
  }
}

export function AttentionPanel({
  data,
  loading,
  period,
}: {
  data: DashboardSummary | null;
  loading: boolean;
  period: DashboardPeriod;
}) {
  return (
    <Card className="border-border shadow-sm lg:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">
                Areas that need your attention
              </CardTitle>
            </div>
            <CardDescription>
              Ranked feedback areas with elevated negative or high-priority
              volume
            </CardDescription>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
          >
            <Link href={insightsHref({ period })}>
              View all in Insights
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : !data || data.attention.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
            <p className="text-sm font-medium">
              No urgent feedback needs attention
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              No elevated negative or high-priority concentrations in this
              period.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.attention.map((item, index) => (
              <li
                key={item.category}
                className="rounded-xl border border-border/80 bg-card p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {index + 1}.
                      </span>
                      <h3 className="text-sm font-semibold">{item.category}</h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          severityBadgeClass(item.severity),
                        )}
                      >
                        {item.severity === "watch" ? "Watch" : item.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span
                        className={
                          item.negativeCount > 0
                            ? "text-destructive"
                            : undefined
                        }
                      >
                        {item.negativeCount} negative
                      </span>
                      {" · "}
                      <span>{item.feedbackCount} total</span>
                      {" · "}
                      <span
                        className={
                          item.highPriorityCount > 0
                            ? "text-destructive"
                            : undefined
                        }
                      >
                        {item.highPriorityCount} high priority
                      </span>
                      {item.change.direction !== "flat" ? (
                        <span
                          className={`ml-2 font-medium ${formatChangeTone(item.change)}`}
                        >
                          {item.change.display}
                        </span>
                      ) : null}
                    </p>
                    {item.signal && (
                      <p className="text-sm leading-relaxed text-foreground/90">
                        <span className="font-medium">Main signal:</span>{" "}
                        {item.signal}
                      </p>
                    )}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                  >
                    <Link
                      href={feedbackFilterHref({
                        category: item.category,
                        highlight: item.evidenceFeedbackId || undefined,
                        date: item.evidenceDateKey || undefined,
                      })}
                    >
                      Investigate
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

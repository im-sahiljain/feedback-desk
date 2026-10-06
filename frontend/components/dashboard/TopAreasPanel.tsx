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
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackFilterHref, formatChangeTone, insightsHref } from "@/lib/dashboard";
import type { DashboardPeriod, DashboardSummary } from "@/types";

function signalLabel(signal: DashboardSummary["topAreas"][number]["signal"]) {
  switch (signal) {
    case "worsening":
      return "Worsening";
    case "improving":
      return "Improving";
    case "high_priority":
      return "High priority";
    case "watch":
      return "Watch";
    default:
      return "Stable";
  }
}

export function TopAreasPanel({
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
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Top feedback areas</CardTitle>
            <CardDescription>
              Category concentrations from analyzed feedback — not issue clusters
            </CardDescription>
          </div>
          <Link
            href={insightsHref({ period })}
            className="text-xs font-medium text-primary hover:underline"
          >
            Explore in Insights
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.topAreas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Not enough categorized feedback yet.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Area</th>
                    <th className="pb-2 font-medium">Feedback</th>
                    <th className="pb-2 font-medium">Negative</th>
                    <th className="pb-2 font-medium">High priority</th>
                    <th className="pb-2 font-medium">Change</th>
                    <th className="pb-2 font-medium">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topAreas.map((row) => (
                    <tr key={row.category} className="border-b border-border/60 last:border-0">
                      <td className="py-3">
                        <Link
                          href={feedbackFilterHref({ category: row.category })}
                          className="font-medium hover:underline"
                        >
                          {row.category}
                        </Link>
                      </td>
                      <td className="py-3 tabular-nums">{row.feedbackCount}</td>
                      <td className="py-3 tabular-nums">{row.negativeCount}</td>
                      <td className="py-3 tabular-nums">{row.highPriorityCount}</td>
                      <td className={`py-3 tabular-nums ${formatChangeTone(row.change)}`}>
                        {row.change.display}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {signalLabel(row.signal)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {data.topAreas.map((row) => (
                <li key={row.category} className="rounded-lg border p-3">
                  <Link
                    href={feedbackFilterHref({ category: row.category })}
                    className="font-medium hover:underline"
                  >
                    {row.category}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.feedbackCount} feedback · {row.negativeCount} negative ·{" "}
                    {row.highPriorityCount} high priority
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs ${formatChangeTone(row.change)}`}>
                      {row.change.display}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {signalLabel(row.signal)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

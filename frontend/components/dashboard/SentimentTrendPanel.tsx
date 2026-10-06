"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummary } from "@/types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES = [
  { key: "positive", label: "Positive", color: "hsl(var(--success))" },
  { key: "neutral", label: "Neutral", color: "hsl(var(--warning))" },
  { key: "negative", label: "Negative", color: "hsl(var(--destructive))" },
  { key: "mixed", label: "Mixed", color: "hsl(var(--info))" },
] as const;

export function SentimentTrendPanel({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  const trend = data?.sentimentTrend ?? [];
  const hasValues = trend.some((b) => b.total > 0);

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Customer sentiment trend</CardTitle>
        <CardDescription>
          Are customers getting happier or less happy over this period?
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !hasValues ? (
          <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
            Not enough previous data to calculate a trend.
          </div>
        ) : (
          <div className="h-[220px] w-full" role="img" aria-label="Sentiment trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {hasValues && (
          <ul className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground md:sr-only">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

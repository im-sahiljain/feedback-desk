"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummary } from "@/types";
import { TrendingUp } from "lucide-react";
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

function getNiceYAxisConfig(max: number) {
  // Add 1 value more above the maximum so wave peaks have headroom and do not hit the top edge
  const upper = Math.max(max + 1, 2);
  if (upper <= 5) {
    return {
      domain: [0, upper] as [number, number],
      ticks: Array.from({ length: upper + 1 }, (_, i) => i),
    };
  }
  const targetTicks = 4;
  const rawStep = upper / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let niceStepNormalized = 1;
  if (normalized > 5) niceStepNormalized = 10;
  else if (normalized > 2) niceStepNormalized = 5;
  else if (normalized > 1) niceStepNormalized = 2;

  const step = Math.max(1, Math.round(niceStepNormalized * magnitude));
  const niceMax = Math.ceil(upper / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax; t += step) {
    ticks.push(t);
  }
  return { domain: [0, niceMax] as [number, number], ticks };
}

export function SentimentTrendPanel({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const trend = data?.sentimentTrend ?? [];
  const hasValues = trend.some((b) => b.total > 0);

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const yAxisConfig = useMemo(() => {
    let max = 0;
    const activeKeys = SERIES.map((s) => s.key).filter((k) => !hiddenSeries.has(k));
    for (const item of trend) {
      for (const k of activeKeys) {
        const val = Number((item as any)[k]) || 0;
        if (val > max) max = val;
      }
    }
    return getNiceYAxisConfig(max);
  }, [trend, hiddenSeries]);

  return (
    <Card className="border-border shadow-sm flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <CardTitle className="text-base">Customer sentiment trend</CardTitle>
        </div>
        <CardDescription>
          Are customers getting happier or less happy over this period?
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0 pb-4">
        {loading && !data ? (
          <Skeleton className="h-[280px] w-full flex-1" />
        ) : !hasValues ? (
          <div className="flex h-full min-h-[260px] flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
            Not enough previous data to calculate a trend.
          </div>
        ) : (
          <div className="flex-1 w-full min-h-[280px]" role="img" aria-label="Sentiment trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -15, right: 8, top: 16, bottom: 0 }}>
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  dy={4}
                />
                <YAxis
                  allowDecimals={false}
                  domain={yAxisConfig.domain}
                  ticks={yAxisConfig.ticks}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={30}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  content={() => (
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-3 text-xs select-none">
                      {SERIES.map((s) => {
                        const isHidden = hiddenSeries.has(s.key);
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleSeries(s.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all text-xs font-medium cursor-pointer ${
                              isHidden
                                ? "opacity-35 border-dashed border-border text-muted-foreground bg-muted/20 line-through"
                                : "border-border hover:border-border/80 hover:bg-muted/40 shadow-xs text-foreground bg-background"
                            }`}
                            title={isHidden ? `Click to show ${s.label} trend` : `Click to hide ${s.label} trend`}
                          >
                            <span
                              className="h-2 w-2 rounded-full transition-transform"
                              style={{
                                backgroundColor: isHidden ? "hsl(var(--muted-foreground))" : s.color,
                              }}
                              aria-hidden
                            />
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {SERIES.map((s) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    fill={`url(#grad-${s.key})`}
                    strokeWidth={2}
                    hide={hiddenSeries.has(s.key)}
                    activeDot={{ r: 4, strokeWidth: 1 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

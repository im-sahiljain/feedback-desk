"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardKpiRow } from "@/components/dashboard/DashboardKpiRow";
import { AttentionPanel } from "@/components/dashboard/AttentionPanel";
import { CustomerBriefPanel } from "@/components/dashboard/CustomerBriefPanel";
import { WhatChangedPanel } from "@/components/dashboard/WhatChangedPanel";
import { TopAreasPanel } from "@/components/dashboard/TopAreasPanel";
import { SentimentTrendPanel } from "@/components/dashboard/SentimentTrendPanel";
import {
  CriticalFeedbackPanel,
  PositiveSignalsPanel,
  ProcessingStatusPanel,
} from "@/components/dashboard/SecondaryPanels";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { DASHBOARD_PERIODS, formatRangeLabel } from "@/lib/dashboard";
import type { DashboardPeriod, DashboardSummary } from "@/types";
import { Clock, Copy, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const { currentProduct, isBootstrapping } = useApp();
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("30d");
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDashboard = useCallback((productId: string, period: DashboardPeriod) => {
    setIsLoading(true);
    setError(null);

    api.analytics
      .getDashboard(productId, period)
      .then((payload: DashboardSummary) => {
        setData(payload);
      })
      .catch(() => {
        setData(null);
        setError("Unable to load dashboard right now.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (currentProduct) {
      loadDashboard(currentProduct.id, selectedPeriod);
    }
  }, [currentProduct, selectedPeriod, loadDashboard]);

  const copyFeedbackLink = async () => {
    const path = currentProduct?.public_feedback_path;
    if (!path) return;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (isBootstrapping) {
    return (
      <AppLayout title="Dashboard" description="What needs your attention">
        <div className="space-y-4">
          <DashboardKpiRow data={null} loading />
        </div>
      </AppLayout>
    );
  }

  if (!currentProduct) {
    return (
      <AppLayout title="Dashboard" description="What needs your attention">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="max-w-sm space-y-2 text-center">
            <h2 className="text-lg font-semibold">No product selected</h2>
            <p className="text-sm text-muted-foreground">
              Choose a product from the sidebar to see your customer intelligence overview.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link href="/products">Go to Products</Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isEmpty = data && data.summary.feedbackCount === 0 && !isLoading;

  return (
    <AppLayout
      title="Dashboard"
      description={`${currentProduct.name} · What needs your attention`}
    >
      <div className="space-y-6">
        <Card className="border-border/80 bg-muted/30 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-md border bg-background p-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  Customer feedback overview · {DASHBOARD_PERIODS.find((p) => p.key === selectedPeriod)?.label}
                </p>
                {data ? (
                  <p className="text-xs text-muted-foreground">
                    {formatRangeLabel(data.period.from, data.period.to)}{" "}
                    {data.period.comparisonLabel}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Compared with the previous matching period
                  </p>
                )}
              </div>
            </div>
            <div
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-background/80 p-1"
              role="group"
              aria-label="Time period"
            >
              {DASHBOARD_PERIODS.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedPeriod(key)}
                  className="h-7 px-2.5 text-xs"
                  aria-pressed={selectedPeriod === key}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => loadDashboard(currentProduct.id, selectedPeriod)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isEmpty ? (
          <Card className="border-dashed">
            <CardContent className="space-y-4 px-6 py-12 text-center">
              <h2 className="text-lg font-semibold">
                Your customer intelligence will appear here once feedback starts arriving.
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Share your public feedback link or add feedback manually to start building
                the command center.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {currentProduct.public_feedback_path ? (
                  <Button size="sm" className="gap-1.5" onClick={copyFeedbackLink}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy feedback link"}
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href="/products">Manage product links</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <DashboardKpiRow data={data} loading={isLoading} />

            <div className="grid gap-4 lg:grid-cols-5">
              <AttentionPanel data={data} loading={isLoading} period={selectedPeriod} />
              <CustomerBriefPanel
                data={data}
                loading={isLoading}
                period={selectedPeriod}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <WhatChangedPanel data={data} loading={isLoading} period={selectedPeriod} />
              <SentimentTrendPanel data={data} loading={isLoading} />
            </div>

            <TopAreasPanel data={data} loading={isLoading} period={selectedPeriod} />

            <div className="grid gap-4 lg:grid-cols-2">
              <PositiveSignalsPanel data={data} loading={isLoading} />
              <CriticalFeedbackPanel data={data} loading={isLoading} />
            </div>

            <ProcessingStatusPanel data={data} loading={isLoading} />
          </>
        )}
      </div>
    </AppLayout>
  );
}

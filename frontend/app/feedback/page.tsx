"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  Suspense,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Loader2,
  Star,
  Mail,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Minus,
  RefreshCw,
  ChevronsUpDown,
  EqualApproximately,
  TrendingUpDown,
} from "lucide-react";
import { authFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Sentiment, Priority, Feedback } from "@/types";
import { normalizeBackendFeedbacks } from "@/lib/normalization";
import { normalizeEvidenceIds } from "@/lib/dashboard";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DateGroup {
  date_key: string;
  formatted_date: string;
  count: number;
}

type ListRow =
  | { kind: "date"; group: DateGroup }
  | { kind: "item"; feedback: Feedback; dateKey: string }
  | { kind: "loading"; dateKey: string };

const PAGE_SIZE = 50;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function extractPagination(raw: unknown): {
  nextCursor: string | null;
  hasMore: boolean;
} {
  if (!raw || typeof raw !== "object") {
    return { nextCursor: null, hasMore: false };
  }
  const pagination = (raw as { pagination?: Record<string, unknown> })
    .pagination;
  if (!pagination) return { nextCursor: null, hasMore: false };
  return {
    nextCursor:
      typeof pagination.next_cursor === "string"
        ? pagination.next_cursor
        : null,
    hasMore: Boolean(pagination.has_more),
  };
}

function parseCategoryQuery(raw: string | null): string[] {
  if (!raw || raw === "all") return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s !== "all"),
    ),
  ];
}

function productCategoryOptions(
  product: {
    settings?: { categories?: unknown };
    config?: { categories?: unknown };
  } | null,
): string[] {
  if (!product) return [];
  const fromSettings = product.settings?.categories;
  const fromConfig = product.config?.categories;
  const raw = Array.isArray(fromSettings)
    ? fromSettings
    : Array.isArray(fromConfig)
      ? fromConfig
      : [];
  return [
    ...new Set(
      raw.filter(
        (c): c is string => typeof c === "string" && c.trim().length > 0,
      ),
    ),
  ].sort();
}

function CategoryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const label =
    selected.length === 0
      ? "All categories"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} categories`;

  const toggle = (category: string) => {
    if (selected.includes(category)) {
      onChange(selected.filter((c) => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-[180px] justify-between px-3 text-xs font-normal"
          aria-label="Category filter"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Categories
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={selected.length === 0}
          onCheckedChange={() => onChange([])}
          onSelect={(e) => e.preventDefault()}
        >
          All categories
        </DropdownMenuCheckboxItem>
        {options.length > 0 && <DropdownMenuSeparator />}
        {options.map((category) => (
          <DropdownMenuCheckboxItem
            key={category}
            checked={selected.includes(category)}
            onCheckedChange={() => toggle(category)}
            onSelect={(e) => e.preventDefault()}
          >
            {category}
          </DropdownMenuCheckboxItem>
        ))}
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No categories configured
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-amber-700 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function formatChipList(items?: string[]) {
  return (items || []).filter(
    (s) => typeof s === "string" && s.trim().length > 0,
  );
}

function SentimentGlyph({
  sentiment,
  analyzing,
  size = "md",
}: {
  sentiment?: string;
  analyzing?: boolean;
  size?: "sm" | "md";
}) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  if (analyzing) {
    return (
      <Loader2
        className={cn(iconClass, "animate-spin text-muted-foreground")}
      />
    );
  }
  if (sentiment === "positive") {
    return (
      <ThumbsUp
        className={cn(iconClass, "text-emerald-600 dark:text-emerald-400")}
      />
    );
  }
  if (sentiment === "negative") {
    return (
      <ThumbsDown className={cn(iconClass, "text-red-600 dark:text-red-400")} />
    );
  }
  if (sentiment === "neutral") {
    return (
      <EqualApproximately
        className={cn(iconClass, "text-amber-600 dark:text-amber-400")}
      />
    );
  }
  if (sentiment === "mixed") {
    return (
      <TrendingUpDown
        className={cn(iconClass, "text-violet-600 dark:text-violet-400")}
      />
    );
  }
  return <Minus className={cn(iconClass, "text-muted-foreground")} />;
}

function formatListTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function FeedbackListRow({
  fb,
  selected,
  onSelect,
}: {
  fb: Feedback;
  selected: boolean;
  onSelect: () => void;
}) {
  const sentiment = fb.analysis?.sentiment;
  const priority = fb.analysis?.priority;
  const primary =
    fb.category || fb.analysis?.category || fb.categories?.[0] || null;
  const allCategories = [
    ...new Set(
      [
        ...(fb.categories || []),
        ...(fb.analysis?.categories || []),
        ...(primary ? [primary] : []),
      ].filter(Boolean),
    ),
  ];
  const extraCount = Math.max(0, allCategories.length - (primary ? 1 : 0));

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-start gap-3 px-3 py-3.5 text-left transition-colors",
        selected ? "bg-muted" : "hover:bg-muted/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        <SentimentGlyph
          sentiment={sentiment}
          analyzing={fb.isAnalyzing}
          size="sm"
        />
      </span>
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-sm">
            <span
              className={cn(
                "font-semibold capitalize",
                fb.isAnalyzing
                  ? "text-muted-foreground"
                  : sentimentTextClass(sentiment),
              )}
            >
              {fb.isAnalyzing
                ? "Analyzing"
                : sentiment
                  ? sentiment
                  : "Unanalyzed"}
            </span>
            {priority && !fb.isAnalyzing && (
              <span className={cn("capitalize", priorityTextClass(priority))}>
                {" · "}
                {priority} priority
              </span>
            )}
            {primary && (
              <span className="text-muted-foreground">
                {" · "}
                {primary}
                {extraCount > 0 ? ` +${extraCount}` : ""}
              </span>
            )}
          </span>
          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {formatListTime(new Date(fb.createdAt))}
          </span>
        </span>
        <span className="line-clamp-1 text-[15px] font-normal leading-6 text-foreground">
          {fb.text}
        </span>
      </span>
      <ChevronRight
        className={cn(
          "mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors",
          selected && "text-foreground/60",
        )}
        aria-hidden
      />
    </button>
  );
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
          "truncate text-base font-medium",
          capitalize && "capitalize",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AnalysisChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="text-base font-semibold text-foreground">{label}</h3>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${label}-${item}`}
            className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-2.5 py-1 text-sm capitalize text-foreground"
          >
            {item.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </section>
  );
}

function FeedbackAnalysisSections({
  analysis,
}: {
  analysis: NonNullable<Feedback["analysis"]>;
}) {
  const hypotheses =
    analysis.rootCauseHypotheses && analysis.rootCauseHypotheses.length > 0
      ? analysis.rootCauseHypotheses
      : analysis.rootCause
        ? [
            {
              hypothesis: analysis.rootCause,
              confidence: undefined as string | undefined,
              evidence: [] as string[],
            },
          ]
        : [];
  const intents = formatChipList(analysis.intents);
  const topics = formatChipList(analysis.topics);
  const capabilities = formatChipList(analysis.requestedCapabilities);
  const praise = formatChipList(analysis.positiveAttributes);
  const issues = analysis.issues || [];
  return (
    <div className="space-y-7">
      <AnalysisChipRow label="Intent" items={intents} />
      <AnalysisChipRow label="Topics" items={topics} />

      {issues.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground">Issues</h3>
          <ul className="mt-3 divide-y divide-border/50">
            {issues.map((issue, idx) => (
              <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <p className="text-base leading-relaxed text-foreground">
                  {issue.description}
                </p>
                {issue.topic && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Topic: {issue.topic}
                  </p>
                )}
                {issue.evidence && issue.evidence.length > 0 && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    “{issue.evidence[0]}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AnalysisChipRow label="Requested capabilities" items={capabilities} />
      <AnalysisChipRow label="Praise" items={praise} />

      {analysis.aspects && analysis.aspects.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground">
            Aspect breakdown
          </h3>
          <ul className="mt-3 divide-y divide-border/50">
            {analysis.aspects.map((asp, idx) => {
              const tone = asp.sentiment?.toLowerCase().includes("pos")
                ? "positive"
                : asp.sentiment?.toLowerCase().includes("neg")
                  ? "negative"
                  : asp.sentiment?.toLowerCase().includes("mix")
                    ? "mixed"
                    : "neutral";
              const detail = asp.observation || asp.snippet;
              const quote = asp.evidence || asp.snippet;
              const severity =
                asp.severity && !["none", "None"].includes(asp.severity)
                  ? asp.severity
                  : null;
              return (
                <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-medium text-foreground">
                      {asp.category}
                    </span>
                    {severity && (
                      <span className="text-sm capitalize text-amber-700 dark:text-amber-400">
                        {severity} severity
                      </span>
                    )}
                    {asp.sentiment && (
                      <span
                        className={cn(
                          "text-sm capitalize",
                          sentimentTextClass(tone),
                        )}
                      >
                        {asp.sentiment}
                      </span>
                    )}
                  </div>
                  {detail && (
                    <p className="mt-1.5 text-base leading-relaxed text-foreground">
                      {detail}
                    </p>
                  )}
                  {quote && quote !== detail && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      “{quote}”
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hypotheses.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground">
            Likely cause
          </h3>
          <ul className="mt-3 space-y-3">
            {hypotheses.map((h, i) => (
              <li key={i} className="space-y-1">
                <p className="text-base leading-relaxed text-foreground">
                  {h.hypothesis}
                </p>
                {h.confidence && (
                  <p className="text-sm text-muted-foreground">
                    Confidence:{" "}
                    <span className="capitalize">{h.confidence}</span>
                  </p>
                )}
                {"evidence" in h &&
                  Array.isArray(h.evidence) &&
                  h.evidence.length > 0 && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      “{h.evidence[0]}”
                    </p>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.actionItems && analysis.actionItems.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground">
            Suggested next steps
          </h3>
          <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-base leading-relaxed text-foreground">
            {analysis.actionItems.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function FeedbackDetail({ fb }: { fb: Feedback }) {
  const analysis = fb.analysis;
  const primaryCategory =
    fb.category || analysis?.category || fb.categories?.[0] || null;
  const allCategories = (() => {
    const fromFb = fb.categories?.length
      ? fb.categories
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
  const hasAnalysis =
    !!analysis &&
    !fb.isAnalyzing &&
    !!(
      analysis.aspects?.length ||
      analysis.rootCauseHypotheses?.length ||
      analysis.rootCause ||
      analysis.actionItems?.length ||
      analysis.intents?.length ||
      analysis.topics?.length ||
      analysis.issues?.length ||
      analysis.requestedCapabilities?.length ||
      analysis.positiveAttributes?.length
    );
  const severity =
    analysis?.severity && analysis.severity !== "none"
      ? analysis.severity
      : null;
  const urgency =
    analysis?.urgency && analysis.urgency !== "none" ? analysis.urgency : null;

  return (
    <article className="mx-auto max-w-2xl space-y-7 text-base">
      <header className="space-y-5">
        {fb.isAnalyzing ? (
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing this feedback…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <MetaPill
              label="Sentiment"
              value={analysis?.sentiment || "Unknown"}
              valueClassName={sentimentTextClass(analysis?.sentiment)}
            />
            <MetaPill
              label="Priority"
              value={
                analysis?.priority ? `${analysis.priority} priority` : "Unknown"
              }
              valueClassName={priorityTextClass(analysis?.priority)}
            />
            {severity && (
              <MetaPill
                label="Severity"
                value={severity}
                valueClassName={priorityTextClass(
                  severity === "critical"
                    ? "critical"
                    : severity === "high"
                      ? "high"
                      : severity === "medium"
                        ? "medium"
                        : "low",
                )}
              />
            )}
            {urgency && (
              <MetaPill
                label="Urgency"
                value={urgency}
                valueClassName={priorityTextClass(
                  urgency === "immediate" || urgency === "high"
                    ? "high"
                    : urgency === "medium"
                      ? "medium"
                      : "low",
                )}
              />
            )}
            <MetaPill
              label="Received"
              value={new Date(fb.createdAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
              capitalize={false}
            />
          </div>
        )}

        {!fb.isAnalyzing && (
          <section>
            <h2 className="text-base font-semibold text-foreground">
              Categories
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {allCategories.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Uncategorized
                </span>
              ) : (
                <>
                  {primaryCategory && (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 py-1 text-sm text-foreground">
                      {primaryCategory}
                      <span className="text-xs text-muted-foreground">
                        Primary
                      </span>
                    </span>
                  )}
                  {secondaryCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground"
                    >
                      {cat}
                    </span>
                  ))}
                </>
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Customer feedback
          </h2>
          <p className="mt-2 text-lg leading-8 text-foreground">{fb.text}</p>
        </section>

        {analysis?.summary && !fb.isAnalyzing && (
          <section className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3.5">
            <h2 className="text-sm font-semibold text-primary">AI Summary</h2>
            <p className="mt-2 text-base leading-7 text-foreground">
              {analysis.summary}
            </p>
          </section>
        )}
      </header>

      {hasAnalysis && analysis && (
        <>
          <div className="border-t border-border/50" />

          <details className="group md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              AI analysis
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <div className="pt-4">
              <FeedbackAnalysisSections analysis={analysis} />
            </div>
          </details>

          <div className="hidden md:block">
            <FeedbackAnalysisSections analysis={analysis} />
          </div>
        </>
      )}

      {(fb.rating || fb.email) && (
        <footer className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-border/50 pt-4 text-sm text-muted-foreground">
          {fb.rating && fb.rating > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>
                Rating{" "}
                <span className="font-medium text-foreground/80">
                  {fb.rating}/5
                </span>
              </span>
            </span>
          )}
          {fb.email && (
            <span className="inline-flex max-w-full items-center gap-1.5 truncate">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{fb.email}</span>
            </span>
          )}
        </footer>
      )}
    </article>
  );
}

function FeedbackInboxList({
  rows,
  selectedId,
  onSelect,
  onNearEnd,
}: {
  rows: ListRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNearEnd: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrolledSelectionRef = useRef<string | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rowsRef.current[index];
      if (!row) return 88;
      if (row.kind === "date") return 44;
      if (row.kind === "loading") return 40;
      return 80;
    },
    getItemKey: (index) => {
      const row = rowsRef.current[index];
      if (!row) return index;
      if (row.kind === "item") return row.feedback.id;
      if (row.kind === "date") return `date-${row.group.date_key}`;
      return `${row.kind}-${row.dateKey}`;
    },
    overscan: 12,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const rangeEnd = virtualItems[virtualItems.length - 1]?.index ?? -1;

  useEffect(() => {
    if (rangeEnd < 0) return;
    if (rangeEnd >= rows.length - 8) onNearEnd();
  }, [rangeEnd, rows.length, onNearEnd]);

  useEffect(() => {
    if (!selectedId) {
      scrolledSelectionRef.current = null;
      return;
    }
    if (scrolledSelectionRef.current === selectedId) return;

    const index = rows.findIndex(
      (r) => r.kind === "item" && r.feedback.id === selectedId,
    );
    if (index < 0) return;

    scrolledSelectionRef.current = selectedId;
    virtualizer.scrollToIndex(index, { align: "auto" });
  }, [selectedId, rows, virtualizer]);

  return (
    <div ref={parentRef} className="h-full overflow-y-auto scrollbar-thin">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.kind === "date" && (
                <div className="flex items-center justify-between gap-2 px-3 pb-1.5 pt-4">
                  <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {row.group.formatted_date || row.group.date_key}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground/80">
                    {row.group.count}
                  </span>
                </div>
              )}
              {row.kind === "item" && (
                <FeedbackListRow
                  fb={row.feedback}
                  selected={selectedId === row.feedback.id}
                  onSelect={() => onSelect(row.feedback.id)}
                />
              )}
              {row.kind === "loading" && (
                <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedbackPageContent() {
  const {
    currentProduct,
    setCurrentProduct,
    products,
    isBootstrapping,
  } = useApp();
  const searchParams = useSearchParams();

  const initialSentiment = searchParams.get("sentiment");
  const initialPriority = searchParams.get("priority");
  const initialCategory = searchParams.get("category");
  const highlightId = searchParams.get("highlight");
  const focusDateKey = searchParams.get("date");
  const productIdFromUrl = searchParams.get("product_id");
  const evidenceIds = useMemo(
    () => normalizeEvidenceIds(searchParams.get("ids")?.split(",") ?? []),
    [searchParams],
  );
  const evidenceFilterActive = evidenceIds.length > 0;

  // Evidence / deep links pin the product so a new tab doesn't fall back to products[0]
  useEffect(() => {
    if (!productIdFromUrl || products.length === 0) return;
    if (currentProduct?.id === productIdFromUrl) return;
    const match = products.find((p) => p.id === productIdFromUrl);
    if (match) setCurrentProduct(match);
  }, [productIdFromUrl, products, currentProduct?.id, setCurrentProduct]);

  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">(
    initialSentiment === "positive" ||
      initialSentiment === "negative" ||
      initialSentiment === "neutral" ||
      initialSentiment === "mixed"
      ? initialSentiment
      : "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">(
    initialPriority === "high" ||
      initialPriority === "medium" ||
      initialPriority === "low"
      ? initialPriority
      : "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<string[]>(() =>
    parseCategoryQuery(initialCategory),
  );
  const [statusFilter] = useState<string>(searchParams.get("status") || "all");
  const [availableCategories, setAvailableCategories] = useState<string[]>(
    () => {
      const seed = parseCategoryQuery(initialCategory);
      return seed;
    },
  );

  const [items, setItems] = useState<Feedback[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(highlightId);
  const [mobileShowDetail, setMobileShowDetail] = useState(!!highlightId);

  const loadingMoreRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const buildFilterParams = useCallback(() => {
    if (!currentProduct) return null;
    const queryParams = new URLSearchParams({
      product_id: currentProduct.id,
      sentiment: sentimentFilter,
      priority: priorityFilter,
      status: statusFilter,
      limit: String(PAGE_SIZE),
    });
    if (categoryFilter.length === 0) {
      queryParams.set("category", "all");
    } else {
      queryParams.set("category", categoryFilter.join(","));
    }
    if (evidenceIds.length > 0) {
      queryParams.set("ids", evidenceIds.join(","));
    }
    return queryParams;
  }, [
    currentProduct,
    sentimentFilter,
    priorityFilter,
    categoryFilter,
    statusFilter,
    evidenceIds,
  ]);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const queryParams = buildFilterParams();
      if (!queryParams || !currentProduct) {
        return {
          pageItems: [] as Feedback[],
          next: null as string | null,
          more: false,
        };
      }
      if (cursor) queryParams.set("cursor", cursor);

      const res = await authFetch(`/api/feedbacks?${queryParams.toString()}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(
          res.status === 429
            ? "Too many requests — wait a moment and try again"
            : `Failed to fetch feedback (${res.status}): ${body}`,
        );
      }

      const data = await res.json();
      const pageItems = normalizeBackendFeedbacks(data, currentProduct.id);
      const { nextCursor: next, hasMore: more } = extractPagination(data);
      return { pageItems, next, more };
    },
    [buildFilterParams, currentProduct],
  );

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current || !currentProduct)
      return;
    if (refreshInFlightRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const { pageItems, next, more } = await fetchPage(cursorRef.current);
      setItems((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        const merged = [...prev];
        for (const item of pageItems) {
          if (!seen.has(item.id)) merged.push(item);
        }
        return merged;
      });
      cursorRef.current = next;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [currentProduct, fetchPage]);

  const refreshInbox = useCallback(async () => {
    if (!currentProduct || refreshInFlightRef.current || isInitialLoading)
      return;

    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    setLoadError(null);
    loadingMoreRef.current = false;
    cursorRef.current = null;
    hasMoreRef.current = false;

    try {
      const groupParams = new URLSearchParams({
        product_id: currentProduct.id,
        sentiment: sentimentFilter,
        priority: priorityFilter,
        status: statusFilter,
      });
      if (categoryFilter.length === 0) {
        groupParams.set("category", "all");
      } else {
        groupParams.set("category", categoryFilter.join(","));
      }
      if (evidenceIds.length > 0) {
        groupParams.set("ids", evidenceIds.join(","));
      }
      const groupsRes = await authFetch(
        `/api/feedbacks/date-groups?${groupParams.toString()}`,
      );
      if (groupsRes.ok) {
        const groups = await groupsRes.json();
        if (Array.isArray(groups)) {
          setTotalCount(
            groups.reduce(
              (acc: number, g: { count?: number }) => acc + (g.count || 0),
              0,
            ),
          );
        }
      }

      const { pageItems, next, more } = await fetchPage(null);
      setItems(pageItems);
      cursorRef.current = next;
      hasMoreRef.current = more;
      setHasMore(more);

      setAvailableCategories((prev) => {
        const cats = new Set<string>([
          ...productCategoryOptions(currentProduct),
          ...prev,
          ...categoryFilter,
        ]);
        for (const fb of pageItems) {
          fb.categories?.forEach((c) => cats.add(c));
          if (fb.analysis?.category) cats.add(fb.analysis.category);
          if (fb.category) cats.add(fb.category);
        }
        return [...cats].sort();
      });

      setSelectedId((prev) => {
        if (prev && pageItems.some((f) => f.id === prev)) return prev;
        return pageItems[0]?.id ?? null;
      });
    } catch (err) {
      console.error(err);
      setLoadError(
        err instanceof Error ? err.message : "Failed to refresh feedback",
      );
    } finally {
      refreshInFlightRef.current = false;
      setIsRefreshing(false);
    }
  }, [
    currentProduct,
    isInitialLoading,
    sentimentFilter,
    priorityFilter,
    categoryFilter,
    statusFilter,
    evidenceIds,
    fetchPage,
  ]);

  // Initial load + filter changes
  useEffect(() => {
    if (!currentProduct) return;
    // Wait until deep-linked product is selected (avoids empty evidence fetches)
    if (productIdFromUrl && currentProduct.id !== productIdFromUrl) return;

    let cancelled = false;
    setIsInitialLoading(true);
    setLoadError(null);
    setItems([]);
    setHasMore(false);
    cursorRef.current = null;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;
    setSelectedId(highlightId);
    setMobileShowDetail(!!highlightId);

    const run = async () => {
      try {
        // Total count from date-groups (single request)
        const groupParams = new URLSearchParams({
          product_id: currentProduct.id,
          sentiment: sentimentFilter,
          priority: priorityFilter,
          status: statusFilter,
        });
        if (categoryFilter.length === 0) {
          groupParams.set("category", "all");
        } else {
          groupParams.set("category", categoryFilter.join(","));
        }
        if (evidenceIds.length > 0) {
          groupParams.set("ids", evidenceIds.join(","));
        }
        const groupsRes = await authFetch(
          `/api/feedbacks/date-groups?${groupParams.toString()}`,
        );
        if (groupsRes.ok) {
          const groups = await groupsRes.json();
          if (!cancelled && Array.isArray(groups)) {
            setTotalCount(
              groups.reduce(
                (acc: number, g: { count?: number }) => acc + (g.count || 0),
                0,
              ),
            );
          }
        }

        // Deep-link: load focus date first so the target item is available
        if (focusDateKey || highlightId) {
          const focusParams = buildFilterParams();
          if (focusParams && focusDateKey) {
            focusParams.set("date", focusDateKey);
            focusParams.delete("limit");
            const focusRes = await authFetch(
              `/api/feedbacks?${focusParams.toString()}`,
            );
            if (focusRes.ok && !cancelled) {
              const focusData = await focusRes.json();
              const focusItems = normalizeBackendFeedbacks(
                focusData,
                currentProduct.id,
              );
              setItems(focusItems);
            }
          }
        }

        if (cancelled) return;

        const { pageItems, next, more } = await fetchPage(null);
        if (cancelled) return;

        setItems((prev) => {
          if (prev.length === 0) return pageItems;
          const seen = new Set(prev.map((f) => f.id));
          const merged = [...prev];
          for (const item of pageItems) {
            if (!seen.has(item.id)) merged.push(item);
          }
          // Keep newest-first order
          merged.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          return merged;
        });
        cursorRef.current = next;
        hasMoreRef.current = more;
        setHasMore(more);

        if (!cancelled) {
          setAvailableCategories((prev) => {
            const cats = new Set<string>([
              ...productCategoryOptions(currentProduct),
              ...prev,
              ...categoryFilter,
            ]);
            for (const fb of pageItems) {
              fb.categories?.forEach((c) => cats.add(c));
              if (fb.analysis?.category) cats.add(fb.analysis.category);
              if (fb.category) cats.add(fb.category);
            }
            return [...cats].sort();
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load feedback",
          );
        }
      } finally {
        if (!cancelled) setIsInitialLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    currentProduct,
    sentimentFilter,
    priorityFilter,
    categoryFilter,
    statusFilter,
    focusDateKey,
    highlightId,
    evidenceIds,
    productIdFromUrl,
    fetchPage,
    buildFilterParams,
  ]);

  // Keep category options available from the product even when filters return no rows
  useEffect(() => {
    if (!currentProduct) return;
    setAvailableCategories((prev) => {
      const cats = new Set<string>([
        ...productCategoryOptions(currentProduct),
        ...prev,
      ]);
      return [...cats].sort();
    });
  }, [currentProduct]);

  // Keep loading pages until highlight is found (bounded)
  useEffect(() => {
    if (!highlightId || isInitialLoading) return;
    if (items.some((f) => f.id === highlightId)) return;
    if (!hasMore || isLoadingMore) return;
    void loadMore();
  }, [highlightId, items, hasMore, isLoadingMore, isInitialLoading, loadMore]);

  const rows: ListRow[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const fb of items) {
      const key = toDateKey(new Date(fb.createdAt));
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const out: ListRow[] = [];
    let currentKey = "";
    for (const fb of items) {
      const key = toDateKey(new Date(fb.createdAt));
      if (key !== currentKey) {
        currentKey = key;
        out.push({
          kind: "date",
          group: {
            date_key: key,
            formatted_date: formatDateLabel(key),
            count: counts.get(key) || 0,
          },
        });
      }
      out.push({ kind: "item", feedback: fb, dateKey: key });
    }
    if (isLoadingMore) {
      out.push({ kind: "loading", dateKey: "__more__" });
    }
    return out;
  }, [items, isLoadingMore]);

  useEffect(() => {
    if (items.length === 0) return;

    if (highlightId) {
      const found = items.find((f) => f.id === highlightId);
      if (found) {
        setSelectedId(found.id);
        return;
      }
    }

    setSelectedId((prev) => {
      if (prev && items.some((f) => f.id === prev)) return prev;
      return items[0]?.id ?? null;
    });
  }, [items, highlightId]);

  const selectedFeedback = items.find((f) => f.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
  };

  const selectRelative = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const idx = items.findIndex((f) => f.id === selectedId);
      const next = Math.min(
        items.length - 1,
        Math.max(0, (idx < 0 ? 0 : idx) + delta),
      );
      setSelectedId(items[next].id);
      setMobileShowDetail(true);
    },
    [items, selectedId],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        selectRelative(1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        selectRelative(-1);
      } else if (e.key === "Escape") {
        setMobileShowDetail(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectRelative]);

  if (isBootstrapping) {
    return (
      <AppLayout title="Feedback" fill>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading…
        </div>
      </AppLayout>
    );
  }

  if (!currentProduct) {
    return (
      <AppLayout title="Feedback" fill>
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm text-center">
            <h2 className="text-base font-semibold">No product selected</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a product from the sidebar to view its feedback.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Feedback"
      description={`${currentProduct.name} · ${totalCount || items.length} items`}
      fill
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div
          className={cn(
            "shrink-0 flex-col gap-2 sm:flex-row sm:items-center",
            mobileShowDetail ? "hidden md:flex" : "flex",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {evidenceFilterActive && (
              <Badge
                variant="secondary"
                className="gap-1.5 py-1 pl-2.5 pr-1 text-xs font-normal"
              >
                Evidence set ({evidenceIds.length})
                <Link
                  href="/feedback"
                  className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Clear
                </Link>
              </Badge>
            )}
            <Select
              value={sentimentFilter}
              onValueChange={(value) =>
                setSentimentFilter(value as Sentiment | "all")
              }
            >
              <SelectTrigger
                className="h-8 w-[140px] text-xs"
                aria-label="Sentiment filter"
              >
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as Priority | "all")
              }
            >
              <SelectTrigger
                className="h-8 w-[130px] text-xs"
                aria-label="Priority filter"
              >
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <CategoryMultiSelect
              options={availableCategories}
              selected={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <p className="text-[11px] text-muted-foreground">
              {isInitialLoading
                ? "Loading…"
                : isRefreshing
                  ? "Refreshing…"
                  : `${items.length}${hasMore ? "+" : ""} loaded`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => void refreshInbox()}
              disabled={isInitialLoading || isRefreshing}
              aria-label="Refresh feedback"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        {loadError && <p className="text-xs text-destructive">{loadError}</p>}

        <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm md:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)]">
          <aside
            className={cn(
              "min-h-0 md:border-r md:border-border/60",
              mobileShowDetail ? "hidden md:block" : "block",
            )}
          >
            {isInitialLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading timeline…
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted-foreground">
                No feedback matches your filters.
              </div>
            ) : (
              <FeedbackInboxList
                rows={rows}
                selectedId={selectedId}
                onSelect={handleSelect}
                onNearEnd={loadMore}
              />
            )}
          </aside>

          <section
            className={cn(
              "min-h-0 overflow-y-auto",
              mobileShowDetail ? "block" : "hidden md:block",
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm md:hidden">
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Inbox
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => void refreshInbox()}
                disabled={isInitialLoading || isRefreshing}
                aria-label="Refresh feedback"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                />
              </Button>
            </div>

            {selectedFeedback ? (
              <div className="px-4 py-4 md:px-8 md:py-7">
                <div className="mb-4 hidden items-center justify-between md:flex">
                  <button
                    type="button"
                    onClick={() => selectRelative(-1)}
                    disabled={!selectedId || items[0]?.id === selectedId}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                    aria-label="Previous feedback"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => selectRelative(1)}
                    disabled={
                      !selectedId || items[items.length - 1]?.id === selectedId
                    }
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                    aria-label="Next feedback"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <FeedbackDetail fb={selectedFeedback} />
              </div>
            ) : (
              <div className="flex h-full min-h-[16rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                {isInitialLoading
                  ? "Loading…"
                  : "Select a feedback item from the list"}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <AppLayout title="Feedback" fill>
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading feedback…
          </div>
        </AppLayout>
      }
    >
      <FeedbackPageContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  Star,
  Filter,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Monitor,
  Server,
  BarChart3,
  Search,
  Lightbulb,
  Mail,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sentiment, Priority, Feedback } from "@/types";
import { useVirtualizer } from "@tanstack/react-virtual";

interface DateGroup {
  date_key: string;
  formatted_date: string;
  count: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  latest_time: string;
  earliest_time: string;
}

// // Single Feedback Card Component
// function FeedbackCard({ fb }: { fb: Feedback }) {
//   return (
//     <Card className="overflow-hidden shadow-sm border border-border/80 hover:border-primary/20 transition-all mb-3">
//       <CardContent className="p-4">
//         <div className="flex gap-4">
//           {/* Sentiment Icon */}
//           <div className="flex-shrink-0 mt-1">
//             {fb.isAnalyzing ? (
//               <Loader2 className="h-5 w-5 animate-spin text-primary" />
//             ) : fb.analysis?.sentiment === "positive" ? (
//               <ThumbsUp className="h-5 w-5 text-emerald-500" />
//             ) : fb.analysis?.sentiment === "negative" ? (
//               <ThumbsDown className="h-5 w-5 text-destructive" />
//             ) : (
//               <Minus className="h-5 w-5 text-amber-500" />
//             )}
//           </div>

//           {/* Content */}
//           <div className="flex-1 min-w-0 space-y-3">
//             <p className="text-sm font-medium text-foreground leading-relaxed">
//               {fb.text}
//             </p>

//             {/* AI Analysis */}
//             {fb.isAnalyzing ? (
//               <div className="flex items-center gap-2 text-xs text-muted-foreground">
//                 <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                 AI analysis in progress...
//               </div>
//             ) : (
//               fb.analysis && (
//                 <div className="space-y-2 pt-1 border-t border-border/40">
//                   <p className="text-xs text-muted-foreground italic">
//                     "{fb.analysis.summary}"
//                   </p>
//                   <div className="flex flex-wrap items-center gap-2">
//                     <Badge
//                       variant={
//                         fb.analysis.sentiment === "positive"
//                           ? "default"
//                           : fb.analysis.sentiment === "negative"
//                             ? "destructive"
//                             : "secondary"
//                       }
//                       className="capitalize text-[11px] font-semibold px-2 py-0.5"
//                     >
//                       {fb.analysis.sentiment}
//                     </Badge>

//                     {/* Render Multi-Category Badges */}
//                     {fb.categories && fb.categories.length > 0 ? (
//                       fb.categories.map((cat, i) => (
//                         <Badge
//                           key={i}
//                           variant="outline"
//                           className="text-[11px] bg-muted/40 font-medium"
//                         >
//                           🏷️ {cat}
//                         </Badge>
//                       ))
//                     ) : (
//                       <Badge variant="outline" className="text-[11px]">
//                         🏷️ {fb.analysis.category}
//                       </Badge>
//                     )}

//                     <Badge
//                       variant={
//                         fb.analysis.priority === "high"
//                           ? "destructive"
//                           : "secondary"
//                       }
//                       className="text-[11px] capitalize font-medium"
//                     >
//                       {fb.analysis.priority} Priority
//                     </Badge>
//                   </div>

//                   {/* Aspect-Based Granular Breakdown */}
//                   {fb.analysis.aspects && fb.analysis.aspects.length > 0 && (
//                     <div className="flex flex-wrap gap-1.5 pt-1">
//                       {fb.analysis.aspects.map((asp, idx) => (
//                         <span
//                           key={idx}
//                           className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-secondary/40 text-secondary-foreground border border-border/60"
//                         >
//                           <span className="font-semibold">{asp.category}:</span>
//                           <span>
//                             {asp.snippet ? `"${asp.snippet}"` : asp.sentiment}
//                           </span>
//                           {asp.severity && asp.severity !== "None" && (
//                             <span className="text-[10px] text-muted-foreground">
//                               ({asp.severity})
//                             </span>
//                           )}
//                         </span>
//                       ))}
//                     </div>
//                   )}

//                   {/* Root Cause Diagnosis */}
//                   {fb.analysis.rootCause && (
//                     <div className="text-xs text-muted-foreground pt-0.5">
//                       <span className="font-medium text-foreground">
//                         🔍 Root Cause:{" "}
//                       </span>
//                       {fb.analysis.rootCause}
//                     </div>
//                   )}

//                   {/* Action Items Box */}
//                   {fb.analysis.actionItems &&
//                     fb.analysis.actionItems.length > 0 && (
//                       <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs space-y-1">
//                         <div className="font-semibold text-primary flex items-center gap-1.5">
//                           <span>💡 Recommended Next Steps:</span>
//                         </div>
//                         <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
//                           {fb.analysis.actionItems.map((action, i) => (
//                             <li key={i}>{action}</li>
//                           ))}
//                         </ul>
//                       </div>
//                     )}
//                 </div>
//               )
//             )}

//             {/* Meta Timestamp */}
//             <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/30">
//               {fb.rating && fb.rating > 0 && (
//                 <span className="flex items-center gap-1">
//                   <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
//                   {fb.rating}/5
//                 </span>
//               )}
//               {fb.email && <span>{fb.email}</span>}
//               <span className="flex items-center gap-1">
//                 <Clock className="h-3 w-3" />
//                 {new Date(fb.createdAt).toLocaleTimeString([], {
//                   hour: "2-digit",
//                   minute: "2-digit",
//                 })}
//               </span>
//             </div>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// Single Feedback Card Component
function FeedbackCard({ fb }: { fb: Feedback }) {
  const analysis = fb.analysis;

  const getAspectIcon = (category: string) => {
    const value = category.toLowerCase();

    if (
      value.includes("ui") ||
      value.includes("ux") ||
      value.includes("frontend")
    ) {
      return Monitor;
    }

    if (
      value.includes("api") ||
      value.includes("backend") ||
      value.includes("error") ||
      value.includes("payment")
    ) {
      return Server;
    }

    if (
      value.includes("performance") ||
      value.includes("speed") ||
      value.includes("latency")
    ) {
      return BarChart3;
    }

    return MessageSquare;
  };

  const sentimentStyles =
    analysis?.sentiment === "positive"
      ? "bg-emerald-500 text-white"
      : analysis?.sentiment === "negative"
        ? "bg-red-500 text-white"
        : "bg-amber-500 text-white";

  const priorityStyles =
    analysis?.priority === "high"
      ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
      : analysis?.priority === "low"
        ? "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800"
        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";

  return (
    <Card className="group overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-200 hover:border-primary/20 hover:shadow-md mb-3">
      <CardContent className="p-0">
        {/* =========================================================
            HEADER
        ========================================================== */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-4">
            {/* Sentiment Icon */}
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${sentimentStyles} shadow-sm`}
            >
              {fb.isAnalyzing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : analysis?.sentiment === "positive" ? (
                <ThumbsUp className="h-5 w-5" />
              ) : analysis?.sentiment === "negative" ? (
                <ThumbsDown className="h-5 w-5" />
              ) : (
                <Minus className="h-5 w-5" />
              )}
            </div>

            {/* Main Content */}
            <div className="min-w-0 flex-1">
              {/* Feedback + Priority */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-[15px] font-semibold leading-6 tracking-[-0.01em] text-foreground">
                  {fb.text}
                </p>

                {analysis && !fb.isAnalyzing && (
                  <Badge
                    variant="outline"
                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${priorityStyles}`}
                  >
                    {analysis.priority} Priority
                  </Badge>
                )}
              </div>

              {/* AI Summary */}
              {fb.isAnalyzing ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  AI analysis in progress...
                </div>
              ) : analysis ? (
                <>
                  {analysis.summary && (
                    <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                      {analysis.summary}
                    </p>
                  )}

                  {/* Classification */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {/* Sentiment */}
                    <Badge
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                        analysis.sentiment === "negative"
                          ? "bg-red-500 text-white hover:bg-red-500"
                          : analysis.sentiment === "positive"
                            ? "bg-emerald-500 text-white hover:bg-emerald-500"
                            : "bg-amber-500 text-white hover:bg-amber-500"
                      }`}
                    >
                      {analysis.sentiment}
                    </Badge>

                    {/* Categories */}
                    {fb.categories && fb.categories.length > 0 ? (
                      fb.categories.map((cat, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="rounded-full border-border/70 bg-muted/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                        >
                          {cat}
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-full border-border/70 bg-muted/30 px-2.5 py-1 text-[10px] font-medium"
                      >
                        {analysis.category}
                      </Badge>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* =========================================================
            AI ANALYSIS
        ========================================================== */}
        {analysis && !fb.isAnalyzing && (
          <div className="border-t border-border/60 px-5 py-4">
            {/* =====================================================
                ASPECT BREAKDOWN
            ====================================================== */}
            {analysis.aspects && analysis.aspects.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {analysis.aspects.map((asp, idx) => {
                  const Icon = getAspectIcon(asp.category);

                  const isCritical = asp.severity?.toLowerCase() === "critical";

                  const isModerate = asp.severity?.toLowerCase() === "moderate";

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/60 bg-muted/20 p-3.5"
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Aspect Icon */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm ring-1 ring-border/50">
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          {/* Aspect Header */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-foreground">
                              {asp.category}
                            </span>

                            {/* Severity */}
                            {asp.severity && asp.severity !== "None" && (
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                                  isCritical
                                    ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                                    : isModerate
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                      : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {asp.severity}
                              </span>
                            )}
                          </div>

                          {/* Aspect Text */}
                          <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
                            {asp.snippet
                              ? `"${asp.snippet}"`
                              : asp.sentiment || "Detected issue"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* =====================================================
                ROOT CAUSE
            ====================================================== */}
            {analysis.rootCause && (
              <div className="mt-3 rounded-xl border border-blue-200/70 bg-blue-50/50 p-3.5 dark:border-blue-900/50 dark:bg-blue-950/20">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <Search className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                      Root Cause
                    </p>

                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
                      {analysis.rootCause}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================
                RECOMMENDED NEXT STEPS
            ====================================================== */}
            {analysis.actionItems && analysis.actionItems.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Recommended Next Steps
                    </p>

                    <div className="mt-2 space-y-2">
                      {analysis.actionItems.map((action, i) => (
                        <div key={i} className="flex gap-2.5">
                          {/* Number */}
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-[10px] font-bold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                            {i + 1}
                          </span>

                          {/* Action */}
                          <p className="text-[12px] leading-5 text-muted-foreground">
                            {action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            FOOTER METADATA
        ========================================================== */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground">
          {/* Rating */}
          {fb.rating && fb.rating > 0 && (
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span className="font-medium">{fb.rating}/5</span>
            </span>
          )}

          {/* Email */}
          {fb.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {fb.email}
            </span>
          )}

          {/* Time */}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />

            {new Date(fb.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Virtualized Feedback List Component for expanded tabs
function VirtualizedFeedbackList({ items }: { items: Feedback[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180,
    overscan: 4,
  });

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs">
        No feedback items match your active filters for this date.
      </div>
    );
  }

  // If item count is small (< 5), render directly without fixed scroll height for cleaner look
  if (items.length <= 5) {
    return (
      <div className="p-3 space-y-3">
        {items.map((fb) => (
          <FeedbackCard key={fb.id} fb={fb} />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[550px] overflow-y-auto p-3 space-y-3 border-t border-border/50 bg-background/50 scrollbar-thin"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const fb = items[virtualItem.index];
          return (
            <div
              key={fb.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FeedbackCard fb={fb} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const { currentProduct } = useApp();
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(false);

  // Filter States
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Accordion Expand/Collapse state: map of date_key -> boolean
  const [openDates, setOpenDates] = useState<Record<string, boolean>>({});

  // Lazy loaded feedback cache: date_key -> Feedback[]
  const [feedbacksByDate, setFeedbacksByDate] = useState<
    Record<string, Feedback[]>
  >({});
  const [loadingDates, setLoadingDates] = useState<Record<string, boolean>>({});

  // Helper to fetch single date feedback
  const fetchFeedbacksForDate = async (dateKey: string) => {
    if (!currentProduct) return;
    setLoadingDates((prev) => ({ ...prev, [dateKey]: true }));

    try {
      const queryParams = new URLSearchParams({
        product_id: currentProduct.id,
        date: dateKey,
        sentiment: sentimentFilter,
        priority: priorityFilter,
        category: categoryFilter,
      });

      const res = await fetch(`/api/feedbacks?${queryParams.toString()}`);
      if (!res.ok) {
        console.error(
          `Failed to fetch feedback for ${dateKey}`,
          await res.text(),
        );
        setFeedbacksByDate((prev) => ({ ...prev, [dateKey]: [] }));
        return;
      }

      const data = await res.json();

      const mappedFeedback: Feedback[] = (Array.isArray(data) ? data : []).map(
        (f: any) => {
          const priorityLabel =
            f.priority_label ||
            (typeof f.priority === "string" ? f.priority : f.priority?.label) ||
            f.raw_ai_metadata?.priority?.label ||
            "";
          let priorityValue: Priority = "medium";
          if (priorityLabel.toLowerCase().includes("high"))
            priorityValue = "high";
          else if (priorityLabel.toLowerCase().includes("low"))
            priorityValue = "low";

          const categoryName =
            f.category_name ||
            (typeof f.category === "string" ? f.category : f.category?.label) ||
            f.raw_ai_metadata?.category?.label ||
            "Uncategorized";
          const sentimentLabel =
            f.sentiment_label ||
            (typeof f.sentiment === "string"
              ? f.sentiment
              : f.sentiment?.label) ||
            f.raw_ai_metadata?.sentiment?.label ||
            "neutral";

          const assignedCategories: string[] =
            Array.isArray(f.categories) && f.categories.length > 0
              ? f.categories
              : Array.isArray(f.raw_ai_metadata?.categories)
                ? f.raw_ai_metadata.categories
                : [categoryName];

          return {
            id: String(f.id ?? ""),
            productId: currentProduct.id,
            text: f.feedback || "",
            rating: f.rating ? Number(f.rating) : 0,
            email: f.email,
            createdAt: new Date(f.created_at || Date.now()),
            categories: assignedCategories,
            sentiment: sentimentLabel.toLowerCase() as any,
            category: categoryName,
            impact: f.impact || "medium",
            status: f.status || "new",
            analysis: {
              sentiment: sentimentLabel.toLowerCase() as any,
              category: categoryName,
              categories: assignedCategories,
              priority: priorityValue,
              summary:
                f.raw_ai_metadata?.summary ||
                (f.feedback
                  ? f.feedback.length > 50
                    ? f.feedback.substring(0, 50) + "..."
                    : f.feedback
                  : ""),
              aspects: Array.isArray(f.raw_ai_metadata?.aspects)
                ? f.raw_ai_metadata.aspects
                : [],
              actionItems: Array.isArray(f.raw_ai_metadata?.action_items)
                ? f.raw_ai_metadata.action_items
                : [],
              rootCause: f.raw_ai_metadata?.root_cause || "",
            },
            isAnalyzing: f.status === "Pending",
          };
        },
      );

      setFeedbacksByDate((prev) => ({ ...prev, [dateKey]: mappedFeedback }));
    } catch (err) {
      console.error(`Error fetching feedback for ${dateKey}:`, err);
    } finally {
      setLoadingDates((prev) => ({ ...prev, [dateKey]: false }));
    }
  };

  // Fetch Date Groups whenever product or filters change
  useEffect(() => {
    if (!currentProduct) return;
    setIsGroupLoading(true);
    // Reset loaded date cache when filters change
    setFeedbacksByDate({});

    const queryParams = new URLSearchParams({
      product_id: currentProduct.id,
      sentiment: sentimentFilter,
      priority: priorityFilter,
      category: categoryFilter,
    });

    fetch(`/api/feedbacks/date-groups?${queryParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          console.error("Failed to fetch date groups:", await res.text());
          return [];
        }
        return res.json();
      })
      .then((groups: DateGroup[]) => {
        const groupArray = Array.isArray(groups) ? groups : [];
        setDateGroups(groupArray);

        // Auto-expand the first date group by default
        if (groupArray.length > 0) {
          const firstKey = groupArray[0].date_key;
          setOpenDates({ [firstKey]: true });
          fetchFeedbacksForDate(firstKey);
        } else {
          setOpenDates({});
        }
      })
      .catch(console.error)
      .finally(() => setIsGroupLoading(false));
  }, [currentProduct, sentimentFilter, priorityFilter, categoryFilter]);

  // Fetch categories once on mount / product change
  useEffect(() => {
    if (currentProduct) {
      fetch(`/api/feedbacks?product_id=${currentProduct.id}`)
        .then(async (res) => {
          if (!res.ok) return [];
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            const cats = new Set<string>();
            data.forEach((f: any) => {
              if (f.category_name) cats.add(f.category_name);
              if (Array.isArray(f.categories))
                f.categories.forEach((c: string) => cats.add(c));
            });
            setAvailableCategories([...cats].sort());
          }
        })
        .catch(console.error);
    }
  }, [currentProduct]);

  // Toggle Tab Collapse/Expand
  const toggleDateTab = (dateKey: string) => {
    const isOpening = !openDates[dateKey];
    setOpenDates((prev) => ({ ...prev, [dateKey]: isOpening }));

    if (isOpening && !feedbacksByDate[dateKey]) {
      fetchFeedbacksForDate(dateKey);
    }
  };

  const totalItemsCount = dateGroups.reduce((acc, g) => acc + g.count, 0);

  if (!currentProduct) {
    return (
      <AppLayout title="Feedback">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">📦</div>
            <h2 className="text-xl font-semibold">No Product Selected</h2>
            <p className="text-muted-foreground">
              Select a product from the sidebar to view feedback
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Feedback Explorer"
      description={`On-demand timeline & virtualized feedback for ${currentProduct.name}`}
    >
      <div className="space-y-5 max-w-5xl mx-auto">
        {/* Filters Bar */}
        <Card className="shadow-sm border border-border/80 bg-gradient-to-r from-card to-secondary/10">
          <CardContent className="py-3.5 px-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold tracking-tight">
                  Filters:
                </span>
              </div>
              <Select
                value={sentimentFilter}
                onValueChange={(value) =>
                  setSentimentFilter(value as Sentiment | "all")
                }
              >
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(value) =>
                  setPriorityFilter(value as Priority | "all")
                }
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                variant="secondary"
                className="ml-auto font-mono text-xs px-2.5 py-1"
              >
                {isGroupLoading
                  ? "Loading dates..."
                  : `${totalItemsCount} Total Items across ${dateGroups.length} Days`}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Collapsible Date and Time Accordion Tabs */}
        {isGroupLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dateGroups.length === 0 ? (
          <Card className="py-12 border-dashed">
            <CardContent className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-base mb-1">
                No Feedback Timeline Found
              </h3>
              <p className="text-xs text-muted-foreground">
                No feedback records match your selected date or filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dateGroups.map((group) => {
              const isOpen = !!openDates[group.date_key];
              const isLoadingDate = !!loadingDates[group.date_key];
              const dateItems = feedbacksByDate[group.date_key] || [];

              return (
                <Card
                  key={group.date_key}
                  className={`overflow-hidden transition-all border ${
                    isOpen
                      ? "border-primary/40 shadow-sm"
                      : "border-border/80 hover:border-primary/20"
                  }`}
                >
                  {/* Collapsible Header Button */}
                  <button
                    onClick={() => toggleDateTab(group.date_key)}
                    className="w-full text-left p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card hover:bg-muted/30 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            {group.formatted_date ||
                              group.date_key ||
                              "Date Pending"}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[11px] font-mono px-2 py-0"
                          >
                            {group.count} {group.count === 1 ? "item" : "items"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            Timeline:{" "}
                            {group.earliest_time && group.latest_time
                              ? `${group.earliest_time} - ${group.latest_time}`
                              : "All Day"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Breakdown Badges & Collapse Trigger Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        {group.positive_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 border-emerald-500/20"
                          >
                            👍 {group.positive_count}
                          </Badge>
                        )}
                        {group.neutral_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0 border-amber-500/20"
                          >
                            ➖ {group.neutral_count}
                          </Badge>
                        )}
                        {group.negative_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0 border-destructive/20"
                          >
                            👎 {group.negative_count}
                          </Badge>
                        )}
                      </div>
                      <div className="p-1 rounded-md bg-secondary/50 text-secondary-foreground ml-1">
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Collapsible Content Area */}
                  {isOpen && (
                    <div>
                      {isLoadingDate ? (
                        <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 border-t border-border/40 bg-muted/10">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Fetching feedback timeline for {group.formatted_date}
                          ...
                        </div>
                      ) : (
                        <VirtualizedFeedbackList items={dateItems} />
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

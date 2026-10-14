"use client";

import { ReactNode, useState } from "react";
import { PanelLeft, ShieldCheck, Cpu } from "lucide-react";
import { AdminNavRail } from "./AdminNavRail";
import { LoadingBackdrop } from "./LoadingBackdrop";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  activeTab?: string;
  onSelectTab?: (tabId: string) => void;
  actions?: ReactNode;
}

export function AdminLayout({
  children,
  title = "FeedbackDesk AI Control Plane",
  description = "Platform-wide operations, Gemini AI observability & tenant governance",
  activeTab = "overview",
  onSelectTab,
  actions,
}: AdminLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex fixed inset-0 overflow-hidden bg-background md:bg-zinc-950/60 md:gap-3 md:p-3">
      <LoadingBackdrop />

      {/* Desktop Dedicated Admin Rail */}
      <AdminNavRail
        className="hidden md:flex"
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />

      {/* Mobile Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[17rem] max-w-[85vw] p-0 pt-2 [&>button]:right-3 [&>button]:top-3 bg-zinc-950 text-zinc-100"
        >
          <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
          <AdminNavRail
            forceExpanded
            className="h-full"
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Admin Console Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-[1.75rem] md:border md:border-border/60 md:shadow-sm">
        {/* Top Operational Status Ribbon */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-zinc-300 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-zinc-100">FeedbackDesk AI Core</span>
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline flex items-center gap-1">
              <Cpu className="h-3 w-3 text-orange-400 inline" /> Gemini 2.5 Flash Online
            </span>
            <span className="text-zinc-500 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden md:inline flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400 inline" /> 5-Layer Anti-Abuse Shield Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-orange-500/40 text-orange-400 bg-orange-500/10 text-[10px] uppercase font-mono">
              INTERNAL USE ONLY
            </Badge>
          </div>
        </div>

        {/* Top Header Bar */}
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-4 md:gap-4 md:px-7 md:py-5 border-b border-border/40">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-xl md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>

            <div className="min-w-0 space-y-0.5">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            </div>
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Scrollable Content Container */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-7 md:py-6 animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

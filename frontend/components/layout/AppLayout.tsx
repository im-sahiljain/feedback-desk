"use client";

import { ReactNode, useState } from "react";
import { PanelLeft } from "lucide-react";
import { AppNavRail } from "./AppNavRail";
import { LoadingBackdrop } from "./LoadingBackdrop";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background md:bg-muted/70 md:gap-3 md:p-3">
      <LoadingBackdrop />

      {/* Desktop rail */}
      <AppNavRail className="hidden md:flex" />

      {/* Mobile drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[17rem] max-w-[85vw] p-0 pt-2 [&>button]:right-3 [&>button]:top-3"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppNavRail
            forceExpanded
            className="h-full"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-[1.75rem] md:border md:border-border/60 md:shadow-sm">
        <div className="flex shrink-0 items-start gap-3 px-4 pt-4 md:gap-4 md:px-7 md:pt-6">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-9 w-9 shrink-0 rounded-xl md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1 space-y-0.5">
            {title && (
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {description && (
              <p className="truncate text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-7xl animate-fade-in px-4 py-4 md:px-7 md:py-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

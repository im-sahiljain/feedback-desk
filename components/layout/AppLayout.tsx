"use client";

import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { LoadingBackdrop } from './LoadingBackdrop';
import { ModeToggle } from '@/components/mode-toggle';
import { UserProfile } from './UserProfile';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {

  return (
    <SidebarProvider>
      <LoadingBackdrop />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
            <SidebarTrigger className="lg:hidden" />

            <div className="flex-1 flex items-center gap-4">
              {title && (
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold">{title}</h1>
                  {description && (
                    <span className="hidden sm:inline text-sm text-muted-foreground">
                      {description}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ModeToggle />
              <UserProfile />
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="container max-w-7xl p-4 lg:p-6 animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

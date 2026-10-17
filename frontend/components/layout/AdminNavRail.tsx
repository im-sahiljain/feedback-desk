"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Sparkles,
  Server,
  ShieldCheck,
  Layers,
  Users,
  FileText,
  Scale,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STORAGE_KEY = "admin-nav-rail:expanded";
const ICON_SLOT = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl";

export const ADMIN_NAV_TABS = [
  { id: "overview", label: "Platform Pulse", url: "/admin", icon: Activity, description: "SaaS health & executive KPIs" },
  { id: "ai-engine", label: "AI Gateway & Ops", url: "/admin/ai-engine", icon: Sparkles, description: "Latency, tokens & multi-model burn" },
  { id: "queue", label: "Worker Queue", url: "/admin/queue", icon: Server, description: "Queue depth & worker health" },
  { id: "anti-spam", label: "Anti-Spam & Links", url: "/admin/anti-spam", icon: ShieldCheck, description: "QR conversion & fraud shield" },
  { id: "feedbacks", label: "Feedback Stream", url: "/admin/feedbacks", icon: Layers, description: "Global cross-tenant triage" },
  { id: "tenants", label: "Tenants & Users", url: "/admin/tenants", icon: Users, description: "Platform user & role management" },
  { id: "audit", label: "Security & Audit", url: "/admin/audit", icon: FileText, description: "Compliance & system audit logs" },
  { id: "legal", label: "Legal & Terms", url: "/admin/legal", icon: Scale, description: "B2B SaaS MSA, DPA & KYC" },
];

interface AdminNavRailProps {
  className?: string;
  activeTab?: string;
  onSelectTab?: (tabId: string) => void;
  forceExpanded?: boolean;
  onNavigate?: () => void;
}

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "AD";
}

export function AdminNavRail({
  className,
  activeTab,
  onSelectTab,
  forceExpanded = false,
  onNavigate,
}: AdminNavRailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useApp();
  const { setTheme } = useTheme();

  const [expanded, setExpanded] = useState(() => {
    if (forceExpanded) return true;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? stored === "true" : true;
    }
    return true;
  });

  const isRailOpen = forceExpanded || expanded;

  const toggleExpanded = () => {
    if (forceExpanded) return;
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    router.replace("/login");
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={cn(
          "flex flex-col shrink-0 select-none bg-zinc-950 text-zinc-100 transition-[width] duration-200 ease-out border-r border-zinc-800/80 md:border md:rounded-[1.75rem] md:shadow-lg",
          isRailOpen ? "w-64" : "w-[4.75rem]",
          className
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-3.5">
          <div className="flex min-w-0 items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Image src="/chat.png" alt="Logo" width={24} height={24} className="object-contain" />
            </div>
            {isRailOpen && (
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-white tracking-tight">FeedbackDesk AI</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono tracking-wider border-orange-500/40 text-orange-400 bg-orange-500/10 uppercase">
                    Platform Admin
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {!forceExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className="hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800/80 hover:text-white transition-colors"
                  aria-label={isRailOpen ? "Collapse sidebar" : "Expand sidebar"}
                >
                  {isRailOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{isRailOpen ? "Collapse" : "Expand"}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-none">
          {ADMIN_NAV_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab
              ? activeTab === item.id
              : item.url === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.url);

            const linkEl = (
              <Link
                key={item.id}
                href={item.url}
                onClick={() => {
                  onSelectTab?.(item.id);
                  onNavigate?.();
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-orange-500 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                <div
                  className={cn(
                    ICON_SLOT,
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-zinc-400 group-hover:text-zinc-100 group-hover:bg-zinc-800/60"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </div>
                {isRailOpen && (
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate text-xs font-semibold">{item.label}</div>
                    <div className={cn("truncate text-[10px]", isActive ? "text-orange-100" : "text-zinc-500")}>
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            );

            if (!isRailOpen) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-semibold text-xs">{item.label}</p>
                    <p className="text-[10px] text-zinc-400">{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkEl;
          })}
        </nav>

        {/* Dynamic Admin Profile Footer */}
        <div className="border-t border-zinc-800/80 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-900 transition-colors",
                  !isRailOpen && "justify-center"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0 border border-orange-500/40 bg-orange-950/50">
                  <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-bold">
                    {user?.name ? initials(user.name) : "AD"}
                  </AvatarFallback>
                </Avatar>
                {isRailOpen && (
                  <div className="min-w-0 flex-1 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-zinc-200">{user?.name || "Platform Admin"}</span>
                      <Badge className="h-3.5 px-1 text-[8px] bg-red-600 text-white font-mono">ADMIN</Badge>
                    </div>
                    <span className="truncate text-[11px] text-zinc-500 block">{user?.email || "admin@feedbackdesk.ai"}</span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isRailOpen ? "top" : "right"} align="start" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200">
              <div className="p-2 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-100 truncate">{user?.name || "Platform Admin"}</p>
                <p className="text-[11px] text-zinc-400 truncate">{user?.email || "admin@feedbackdesk.ai"}</p>
                <p className="text-[10px] text-orange-400 font-mono mt-0.5">Role: {user?.role || "admin"}</p>
              </div>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer text-xs hover:bg-zinc-800">
                <Moon className="h-3.5 w-3.5 mr-2" /> Dark theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer text-xs hover:bg-zinc-800">
                <Sun className="h-3.5 w-3.5 mr-2" /> Light theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer text-xs hover:bg-zinc-800">
                <Laptop className="h-3.5 w-3.5 mr-2" /> System theme
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs text-red-400 hover:bg-zinc-800 hover:text-red-300">
                <LogOut className="h-3.5 w-3.5 mr-2" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}

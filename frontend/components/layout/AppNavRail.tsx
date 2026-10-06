"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { INDUSTRY_ICONS, INDUSTRY_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
import { ModeToggle } from "@/components/mode-toggle";

const STORAGE_KEY = "nav-rail:expanded";
const ICON_SLOT = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl";

/** Survives AppLayout remounts on client navigations. */
let lastExpanded: boolean | undefined;

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: Package },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Insights", url: "/insights", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function readStoredExpanded(): boolean {
  if (typeof lastExpanded === "boolean") return lastExpanded;
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* ignore */
  }
  return false;
}

function persistExpanded(value: boolean) {
  lastExpanded = value;
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    /* ignore */
  }
}

function RailLabel({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden whitespace-nowrap text-sm font-medium transition-[opacity,max-width] duration-200",
        expanded ? "ml-2.5 max-w-[9rem] opacity-100" : "ml-0 max-w-0 opacity-0",
      )}
      aria-hidden={!expanded}
    >
      {children}
    </span>
  );
}

export function AppNavRail({
  className,
  forceExpanded = false,
  onNavigate,
}: {
  className?: string;
  forceExpanded?: boolean;
  onNavigate?: () => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentProduct,
    setCurrentProduct,
    setIsLoadingProduct,
    products,
    user,
  } = useApp();

  const [expandedState, setExpanded] = useState(() =>
    typeof lastExpanded === "boolean" ? lastExpanded : false,
  );
  const [productsOpen, setProductsOpen] = useState(false);

  useEffect(() => {
    if (forceExpanded) return;
    const stored = readStoredExpanded();
    lastExpanded = stored;
    setExpanded(stored);
  }, [forceExpanded]);

  const expanded = forceExpanded || expandedState;

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      persistExpanded(next);
      return next;
    });
  };

  const handleProductChange = (product: (typeof products)[number]) => {
    setIsLoadingProduct(true);
    setCurrentProduct(product);
    setProductsOpen(false);
    onNavigate?.();
    setTimeout(() => setIsLoadingProduct(false), 600);
  };

  const openCreateProduct = () => {
    setProductsOpen(false);
    router.push("/products?action=create");
    onNavigate?.();
  };

  const productList = (
    <>
      {(products || []).length === 0 ? (
        <button
          type="button"
          onClick={openCreateProduct}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
        >
          <Plus className="h-4 w-4 text-primary" />
          Create product
        </button>
      ) : (
        <>
          {(products || []).map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => handleProductChange(product)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-accent",
                currentProduct?.id === product.id && "bg-accent/70",
              )}
            >
              <span className="text-base shrink-0">
                {INDUSTRY_ICONS[product.industry] || "🏢"}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-medium">
                  {product.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {INDUSTRY_LABELS[product.industry] || product.industry}
                </span>
              </div>
              {currentProduct?.id === product.id && (
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  Active
                </Badge>
              )}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={openCreateProduct}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent"
          >
            <Plus className="h-4 w-4 text-primary" />
            Create product
          </button>
        </>
      )}
    </>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col overflow-hidden py-3 pl-2 pr-2 transition-[width] duration-200 ease-out",
          forceExpanded ? "w-full" : expanded ? "w-[13.5rem]" : "w-14",
          className,
        )}
      >
        {/* Brand — icon stays in fixed 40×40 slot */}
        <Link
          href="/"
          onClick={() => onNavigate?.()}
          className="mb-3 flex h-10 w-full items-center overflow-hidden rounded-xl"
          title="Feedback Desk AI"
        >
          <span
            className={cn(
              ICON_SLOT,
              "border border-border/50 bg-background shadow-sm",
            )}
          >
            <Image
              src="/chat.png"
              alt="Feedback Desk AI"
              width={24}
              height={24}
              className="rounded-md"
            />
          </span>
          <RailLabel expanded={expanded}>Feedback Desk</RailLabel>
        </Link>

        {/* Product switcher — accordion on mobile drawer, dropdown on desktop */}
        {forceExpanded ? (
          <div className="mb-2 overflow-hidden">
            <Button
              variant="ghost"
              className="h-10 w-full justify-start overflow-hidden rounded-xl px-0 hover:bg-background/80"
              onClick={() => setProductsOpen((o) => !o)}
              aria-expanded={productsOpen}
            >
              <span className={cn(ICON_SLOT, "text-base leading-none")}>
                {currentProduct ? (
                  INDUSTRY_ICONS[currentProduct.industry] || "🏢"
                ) : (
                  <Plus className="h-4 w-4 text-primary" />
                )}
              </span>
              <span className="ml-2.5 min-w-0 flex-1 truncate text-left text-sm font-medium">
                {currentProduct?.name || "Add product"}
              </span>
              <ChevronDown
                className={cn(
                  "mr-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  productsOpen && "rotate-180",
                )}
              />
            </Button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                productsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="mt-1 max-h-56 space-y-0.5 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-1.5">
                  {productList}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="mb-2 h-10 w-full justify-start overflow-hidden rounded-xl px-0 hover:bg-background/80"
                  >
                    <span className={cn(ICON_SLOT, "text-base leading-none")}>
                      {currentProduct ? (
                        INDUSTRY_ICONS[currentProduct.industry] || "🏢"
                      ) : (
                        <Plus className="h-4 w-4 text-primary" />
                      )}
                    </span>
                    <RailLabel expanded={expanded}>
                      {currentProduct?.name || "Add product"}
                    </RailLabel>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={8}>
                  {currentProduct?.name || "Select product"}
                </TooltipContent>
              )}
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-56">
              {(products || []).length === 0 ? (
                <DropdownMenuItem
                  onClick={openCreateProduct}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4 text-primary" />
                  Create product
                </DropdownMenuItem>
              ) : (
                <>
                  {(products || []).map((product) => (
                    <DropdownMenuItem
                      key={product.id}
                      onClick={() => handleProductChange(product)}
                      className="cursor-pointer"
                    >
                      <span className="mr-2 text-base">
                        {INDUSTRY_ICONS[product.industry] || "🏢"}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-medium">
                          {product.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {INDUSTRY_LABELS[product.industry] ||
                            product.industry}
                        </span>
                      </div>
                      {currentProduct?.id === product.id && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-[10px]"
                        >
                          Active
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={openCreateProduct}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    Create product
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <nav className="flex flex-1 flex-col gap-1 overflow-hidden">
          {navItems.map((item) => {
            const isActive =
              item.url === "/"
                ? pathname === "/"
                : pathname.startsWith(item.url);

            const link = (
              <Link
                href={item.url}
                onClick={() => onNavigate?.()}
                className="flex h-10 w-full items-center overflow-hidden rounded-xl"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    ICON_SLOT,
                    "border transition-colors",
                    isActive
                      ? "border-border/60 bg-background text-primary shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <RailLabel expanded={expanded}>{item.title}</RailLabel>
              </Link>
            );

            if (expanded) {
              return <div key={item.title}>{link}</div>;
            }

            return (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 overflow-hidden">
          <div className="flex h-10 w-full items-center overflow-hidden">
            <ModeToggle />
            <RailLabel expanded={expanded}>Theme</RailLabel>
          </div>

          {!forceExpanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-full justify-start overflow-hidden rounded-xl px-0 text-muted-foreground hover:text-foreground"
                  onClick={toggleExpanded}
                  aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                >
                  <span className={ICON_SLOT}>
                    {expanded ? (
                      <PanelLeftClose className="h-[18px] w-[18px]" />
                    ) : (
                      <PanelLeftOpen className="h-[18px] w-[18px]" />
                    )}
                  </span>
                  <RailLabel expanded={expanded}>Collapse</RailLabel>
                </Button>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={8}>
                  Expand sidebar
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {user ? (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="flex h-10 w-full items-center overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className={ICON_SLOT}>
                        <Avatar className="h-8 w-8 border border-border/60 shadow-sm">
                          <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
                            {initials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </span>
                      <RailLabel expanded={expanded}>{user.name}</RailLabel>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={8}>
                    {user.name}
                  </TooltipContent>
                )}
              </Tooltip>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
                    className="cursor-pointer"
                    onClick={() => onNavigate?.()}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => api.auth.logout()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 w-full justify-start overflow-hidden rounded-xl px-0 text-muted-foreground hover:text-destructive"
                  onClick={() => api.auth.logout()}
                >
                  <span className={ICON_SLOT}>
                    <LogOut className="h-4 w-4" />
                  </span>
                  <RailLabel expanded={expanded}>Logout</RailLabel>
                </Button>
              </TooltipTrigger>
              {!expanded && (
                <TooltipContent side="right" sideOffset={8}>
                  Logout
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

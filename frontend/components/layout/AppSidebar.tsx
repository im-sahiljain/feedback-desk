"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { INDUSTRY_ICONS, INDUSTRY_LABELS } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { api } from "@/lib/api";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Products", url: "/products", icon: Package },
  { title: "Feedback", url: "/feedback", icon: MessageSquare },
  { title: "Insights", url: "/insights", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentProduct, setCurrentProduct, setIsLoadingProduct, products } =
    useApp();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleProductChange = (product: any) => {
    setIsLoadingProduct(true);
    setCurrentProduct(product);
    if (isMobile) setOpenMobile(false);
    setTimeout(() => {
      setIsLoadingProduct(false);
    }, 800);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border transition-all duration-300"
    >
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Image
            src="/chat.png"
            alt="Feedback Desk AI"
            width={32}
            height={32}
            className="shrink-0 rounded-md"
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
            <span className="font-semibold text-sm truncate">
              Feedback Desk AI
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              Feedback Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Product Switcher */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground p-0">
              Product
            </SidebarGroupLabel>
            <Link
              href="/products?action=create"
              className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
              title="Add Product"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>
          <SidebarGroupContent className="mt-1">
            {!products || products.length === 0 ? (
              <Button
                variant="outline"
                onClick={() => router.push("/products?action=create")}
                className="w-full justify-start gap-2 px-2.5 py-2 h-auto text-xs font-medium border-dashed border-primary/50 text-primary hover:bg-primary/10 group-data-[collapsible=icon]:px-1.5 group-data-[collapsible=icon]:justify-center"
                title="Add Product"
              >
                <Plus className="h-4 w-4 shrink-0 text-primary" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Add Product
                </span>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-2.5 py-2 h-auto group-data-[collapsible=icon]:px-1.5"
                    title={
                      currentProduct ? currentProduct.name : "Select product"
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {currentProduct ? (
                        <>
                          <span className="text-lg shrink-0">
                            {INDUSTRY_ICONS[currentProduct.industry] || "🏢"}
                          </span>
                          <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="font-medium text-sm truncate max-w-[130px]">
                              {currentProduct.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {INDUSTRY_LABELS[currentProduct.industry] ||
                                currentProduct.industry}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Plus className="h-4 w-4 text-primary shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden font-medium text-foreground">
                            Add Product
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {(products || []).map((product) => (
                    <DropdownMenuItem
                      key={product.id}
                      onClick={() => handleProductChange(product)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-lg">
                        {INDUSTRY_ICONS[product.industry] || "🏢"}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs truncate">
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
                    onClick={() => router.push("/products?action=create")}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    <span className="text-xs">Create Product</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link
                        href={item.url}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive && "text-primary",
                          )}
                        />
                        <span className="group-data-[collapsible=icon]:hidden text-sm font-medium">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border flex flex-col gap-1">
        {/* Toggle Expand/Collapse button inside Sidebar footer */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 px-2.5 text-xs text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={() => toggleSidebar()}
          title={
            isCollapsed
              ? "Expand Sidebar (Ctrl+B)"
              : "Collapse Sidebar (Ctrl+B)"
          }
          suppressHydrationWarning
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden font-medium">
                Collapse Sidebar
              </span>
            </>
          )}
        </Button>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 px-2.5 text-xs text-destructive hover:text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          onClick={() => {
            api.auth.logout();
          }}
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden font-medium">
            Logout
          </span>
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

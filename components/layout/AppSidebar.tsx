"use client";

import { LayoutDashboard, Package, MessageSquare, BarChart3, Settings, ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { INDUSTRY_ICONS, INDUSTRY_LABELS } from '@/types';
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
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { api } from '@/lib/api';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Feedback', url: '/feedback', icon: MessageSquare },
  { title: 'Insights', url: '/insights', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentProduct, setCurrentProduct, setIsLoadingProduct, products } = useApp();

  const handleProductChange = (product: any) => {
    // Show loading backdrop
    setIsLoadingProduct(true);

    // Update product (pages will react to this change)
    setCurrentProduct(product);

    // Hide loading after a short delay to allow pages to refetch
    setTimeout(() => {
      setIsLoadingProduct(false);
    }, 800);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/chat.png"
            alt="Feedback Desk AI"
            width={40}
            height={40}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Feedback Desk AI</span>
            <span className="text-xs text-muted-foreground">Feedback Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Product Switcher */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Product
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 py-2 h-auto"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {currentProduct && (
                      <>
                        <span className="text-lg shrink-0">
                          {INDUSTRY_ICONS[currentProduct.industry]}
                        </span>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-medium text-sm truncate max-w-[140px]">
                            {currentProduct.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {INDUSTRY_LABELS[currentProduct.industry]}
                          </span>
                        </div>
                      </>
                    )}
                    {!currentProduct && (
                      <span className="text-sm text-muted-foreground">Select product</span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {(products || []).map(product => (
                  <DropdownMenuItem
                    key={product.id}
                    onClick={() => handleProductChange(product)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-lg">{INDUSTRY_ICONS[product.industry]}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {INDUSTRY_LABELS[product.industry]}
                      </span>
                    </div>
                    {currentProduct?.id === product.id && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Active
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/products?action=create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create Product</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2">
                        <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button variant="ghost" onClick={() => {
          api.auth.logout();
        }}>
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

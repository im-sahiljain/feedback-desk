import { LayoutDashboard, Package, MessageSquare, BarChart3, Settings, Moon, Sun, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Feedback', url: '/feedback', icon: MessageSquare },
  { title: 'Insights', url: '/insights', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { products, currentProduct, setCurrentProduct, userRole, setUserRole, isDarkMode, toggleDarkMode } = useApp();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            AI
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">FeedbackAI</span>
            <span className="text-xs text-muted-foreground">Insights Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Product Switcher */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Workspace
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
                      <span className="text-sm text-muted-foreground">Select workspace</span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {products.map(product => (
                  <DropdownMenuItem
                    key={product.id}
                    onClick={() => setCurrentProduct(product)}
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
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                  >
                    <Link
                      href={item.url}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                        pathname === item.url
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-4">
        {/* Role Switcher */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">View as:</span>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs', userRole === 'user' && 'font-medium')}>User</span>
            <Switch
              checked={userRole === 'admin'}
              onCheckedChange={checked => setUserRole(checked ? 'admin' : 'user')}
            />
            <span className={cn('text-xs', userRole === 'admin' && 'font-medium')}>Admin</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="h-8 w-8 p-0"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

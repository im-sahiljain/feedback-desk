"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';
import { Product } from '@/types';
import { authFetch } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AppContextType {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Product Selection
  currentProduct: Product | null;
  setCurrentProduct: (product: Product | null) => void;
  isLoadingProduct: boolean;
  setIsLoadingProduct: (loading: boolean) => void;
  /** True until auth + initial products resolve — avoid empty-state flashes */
  isBootstrapping: boolean;

  // Products List
  products: Product[];

  // User
  user: User | null;
  refetchUser: () => void;
  refreshProducts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const isPublicPath = (pathname: string) =>
  pathname === '/login' ||
  pathname === '/signup' ||
  pathname.startsWith('/submit-feedback') ||
  pathname.startsWith('/f/');

export function AppProvider({ children }: { children: ReactNode }) {
  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const isDarkMode = resolvedTheme === 'dark';

  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [productsChecked, setProductsChecked] = useState(false);

  const onPublicRoute = isPublicPath(pathname);
  const isBootstrapping =
    !onPublicRoute && (!authChecked || (user !== null && !productsChecked));

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setProducts([]);
    setCurrentProduct(null);
    setProductsChecked(true);
    setAuthChecked(true);
    if (!isPublicPath(pathname)) {
      router.replace('/login');
    }
  }, [pathname, router]);

  const fetchUser = useCallback(() => {
    return authFetch('/api/auth/me')
      .then(async (res) => {
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          // Force a products load for this session
          setProductsChecked(false);
        } else {
          handleSessionExpired();
        }
      })
      .catch((err) => {
        console.error('Failed to fetch user:', err);
        setUser(null);
        setProducts([]);
        setCurrentProduct(null);
        setProductsChecked(true);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [handleSessionExpired]);

  // Auth check on protected routes; skip bootstrap on public pages
  useEffect(() => {
    if (onPublicRoute) {
      setAuthChecked(true);
      return;
    }
    if (!authChecked) {
      fetchUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPublicRoute]);

  const refreshProducts = useCallback(() => {
    setIsLoadingProduct(true);
    return authFetch('/api/products')
      .then(async (res) => {
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        if (!res.ok) {
          console.error('Failed to fetch products:', res.status);
          setProducts([]);
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data);
          setCurrentProduct((prev) => {
            if (!prev && data.length > 0) {
              return data[0];
            }
            if (prev && !data.some((p: Product) => p.id === prev.id)) {
              return data[0] || null;
            }
            return prev;
          });
        } else {
          console.error('Products API did not return an array:', data);
          setProducts([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch products:', err);
        setProducts([]);
      })
      .finally(() => {
        setIsLoadingProduct(false);
        setProductsChecked(true);
      });
  }, [handleSessionExpired]);
  // Fetch products once user is known
  useEffect(() => {
    if (!authChecked || !user || productsChecked) return;
    refreshProducts();
  }, [user, authChecked, productsChecked, refreshProducts]);

  const toggleDarkMode = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value: AppContextType = {
    isDarkMode,
    toggleDarkMode,
    currentProduct,
    setCurrentProduct,
    isLoadingProduct,
    setIsLoadingProduct,
    isBootstrapping,
    products,
    user,
    refetchUser: fetchUser,
    refreshProducts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

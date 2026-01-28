"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';
import { Product } from '@/types';

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

  // Products List
  products: Product[];

  // User
  user: User | null;
  refetchUser: () => void;
  refreshProducts: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {

  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();

  // Use resolvedTheme to correctly identify if we are in dark mode (handles system preference)
  const isDarkMode = resolvedTheme === 'dark';

  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = useCallback(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(err => {
        console.error('Failed to fetch user:', err);
        setUser(null);
      });
  }, []);

  // Fetch user data once on mount only (excluding public auth pages)
  useEffect(() => {
    if (pathname === '/login' || pathname === '/signup') {
      return;
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProducts = useCallback(() => {
    setIsLoadingProduct(true);
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array before setting
        if (Array.isArray(data)) {
          setProducts(data);

          // Only set first product if none selected
          setCurrentProduct(prev => {
            if (!prev && data.length > 0) {
              return data[0];
            }
            return prev;
          });
        } else {
          console.error('Products API did not return an array:', data);
          setProducts([]); // Ensure products is always an array
        }
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setProducts([]); // Ensure products is always an array even on error
      })
      .finally(() => {
        setIsLoadingProduct(false);
      });
  }, []);

  // Fetch products when user is set
  useEffect(() => {
    if (user) {
      refreshProducts();
    } else {
      setProducts([]);
      setCurrentProduct(null);
    }
  }, [user, refreshProducts]);

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

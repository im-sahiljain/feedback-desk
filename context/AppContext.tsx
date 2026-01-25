import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Product, Feedback } from '@/types';
import { api } from '@/lib/api';

type UserRole = 'admin' | 'user';

interface AppContextType {
  // Products
  products: Product[];
  currentProduct: Product | null;
  setCurrentProduct: (product: Product | null) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Feedback
  feedback: Feedback[];
  getProductFeedback: (productId: string) => Feedback[];
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'analysis' | 'isAnalyzing'>) => Promise<void>;

  // Role
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  // User
  user: { id: string | number; email: string; name?: string } | null;
  setUser: (user: { id: string | number; email: string; name?: string } | null) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [user, setUser] = useState<{ id: string | number; email: string; name?: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Load user from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user_data');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse user data', e);
        }
      }
    }
  }, []);

  // Fetch products on load
  useEffect(() => {
    // Don't fetch if no user (e.g. public page)
    if (!user) return;

    api.products.list()
      .then(data => {
        setProducts(data);
        if (data.length > 0 && !currentProduct) {
          // Try to restore from localStorage or default to first
          setCurrentProduct(data[0]);
        }
      })
      .catch((error: any) => {
        console.error(error);
        if (error.status === 401) {
          setUser(null);
          localStorage.removeItem('user_data');
        }
      });
  }, [user]);
  // Fetch feedback when current product changes
  useEffect(() => {
    if (currentProduct && user) {
      api.feedbacks.list(currentProduct.id)
        .then(data => {
          const mappedFeedback = data.map((f: any) => ({
            id: f.id.toString(),
            productId: currentProduct.id,
            text: f.feedback,
            rating: f.rating || 0,
            email: f.email,
            createdAt: new Date(f.created_at),
            analysis: {
              sentiment: f.sentiment?.label?.toLowerCase() || 'neutral',
              category: f.category?.label || 'General',
              priority: f.priority?.label?.toLowerCase() || 'medium',
              summary: f.feedback.substring(0, 50) + '...',
            },
            isAnalyzing: f.status === 'Pending',
          }));
          setFeedback(mappedFeedback);
        })
        .catch(console.error);
    } else {
      setFeedback([]);
    }
  }, [currentProduct, user]);


  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      if (newValue) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newValue;
    });
  }, []);

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      const newProduct = await api.products.create(productData);
      setProducts(prev => [...prev, newProduct]);
      setCurrentProduct(newProduct);
    } catch (error) {
      console.error("Failed to create product:", error);
      throw error;
    }
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
    setCurrentProduct(prev =>
      prev?.id === id ? { ...prev, ...updates } : prev
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    setFeedback(prev => prev.filter(f => f.productId !== id));
    setCurrentProduct(prev => (prev?.id === id ? null : prev));
  }, []);

  const getProductFeedback = useCallback(
    (productId: string) => feedback.filter(f => f.productId === productId),
    [feedback]
  );

  const addFeedback = useCallback(
    async (feedbackData: Omit<Feedback, 'id' | 'createdAt' | 'analysis' | 'isAnalyzing'>) => {
      try {
        const payload = {
          product_id: feedbackData.productId,
          feedback: feedbackData.text,
          email: feedbackData.email,
          rating: feedbackData.rating
        };

        const response = await api.feedbacks.submit(payload);

        if (currentProduct && currentProduct.id === feedbackData.productId) {
          const data = await api.feedbacks.list(currentProduct.id);
          const mappedFeedback = data.map((f: any) => ({
            id: f.id.toString(),
            productId: currentProduct.id,
            text: f.feedback,
            rating: f.rating || 0,
            email: f.email,
            createdAt: new Date(f.created_at),
            analysis: {
              sentiment: f.sentiment?.label?.toLowerCase() || 'neutral',
              category: f.category?.label || 'General',
              priority: f.priority?.label?.toLowerCase() || 'medium',
              summary: f.feedback.substring(0, 50) + '...',
            },
            isAnalyzing: f.status === 'Pending',
          }));
          setFeedback(mappedFeedback);
        }

      } catch (error) {
        console.error("Failed to submit feedback:", error);
        throw error;
      }
    },
    [currentProduct]
  );

  const value: AppContextType = {
    products,
    currentProduct,
    setCurrentProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    feedback,
    getProductFeedback,
    addFeedback,
    userRole,
    setUserRole,
    user,
    setUser,
    isDarkMode,
    toggleDarkMode,
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

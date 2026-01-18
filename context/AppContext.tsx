import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Product, Feedback, Industry, DEFAULT_CATEGORIES, DEFAULT_AI_PROMPTS } from '@/types';
import { mockProducts, mockFeedback } from '@/lib/mockData';
import { analyzeTextWithMockAI } from '@/lib/mockAI';

type UserRole = 'admin' | 'user';

interface AppContextType {
  // Products
  products: Product[];
  currentProduct: Product | null;
  setCurrentProduct: (product: Product | null) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Feedback
  feedback: Feedback[];
  getProductFeedback: (productId: string) => Feedback[];
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'analysis' | 'isAnalyzing'>) => Promise<void>;
  
  // Role
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(mockProducts[0]);
  const [feedback, setFeedback] = useState<Feedback[]>(mockFeedback);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

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

  const addProduct = useCallback((productData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date(),
    };
    setProducts(prev => [...prev, newProduct]);
    setCurrentProduct(newProduct);
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
      const newFeedback: Feedback = {
        ...feedbackData,
        id: `fb-${Date.now()}`,
        createdAt: new Date(),
        isAnalyzing: true,
      };

      setFeedback(prev => [newFeedback, ...prev]);

      // Find product for AI analysis context
      const product = products.find(p => p.id === feedbackData.productId);
      if (product) {
        try {
          const analysis = await analyzeTextWithMockAI(
            feedbackData.text,
            product.industry,
            product.config.categories
          );

          setFeedback(prev =>
            prev.map(f =>
              f.id === newFeedback.id
                ? { ...f, analysis, isAnalyzing: false }
                : f
            )
          );
        } catch (error) {
          setFeedback(prev =>
            prev.map(f =>
              f.id === newFeedback.id
                ? { ...f, isAnalyzing: false }
                : f
            )
          );
        }
      }
    },
    [products]
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

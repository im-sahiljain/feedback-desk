"use client";

import { useApp } from '@/context/AppContext';
import { Loader2 } from 'lucide-react';

export function LoadingBackdrop() {
    const { isLoadingProduct } = useApp();

    if (!isLoadingProduct) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Loading product data...</p>
            </div>
        </div>
    );
}

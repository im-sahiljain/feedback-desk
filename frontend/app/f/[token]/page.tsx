"use client";

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function RetiredPublicFeedbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-sm text-center shadow-sm">
                <CardContent className="pt-8 pb-6 px-6 space-y-4">
                    <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-lg font-bold">Feedback Link Retired</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Generic public feedback links have been retired. Please use your personal 1-time feedback link or scan the counter QR code at the checkout desk.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

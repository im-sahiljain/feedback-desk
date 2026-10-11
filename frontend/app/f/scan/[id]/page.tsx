"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

type ScanState = 'checking' | 'dispensing' | 'already_submitted' | 'revoked' | 'error';

export default function CounterScanPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [state, setState] = useState<ScanState>('checking');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const startDispense = async () => {
        if (!id) {
            setState('error');
            setErrorMessage('Invalid QR code.');
            return;
        }

        // Check if customer already submitted feedback for this counter in the last 24 hours
        try {
            const lastSubmittedStr = localStorage.getItem(`counter_submitted_${id}`);
            if (lastSubmittedStr) {
                const lastSubmitted = parseInt(lastSubmittedStr, 10);
                const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                if (!isNaN(lastSubmitted) && Date.now() - lastSubmitted < ONE_DAY_MS) {
                    setState('already_submitted');
                    return;
                }
            }
        } catch {
            // Ignore localStorage errors (e.g. private browsing restrictions)
        }

        // Check if there is an active unsubmitted token in this session
        try {
            const activeToken = sessionStorage.getItem(`active_counter_token_${id}`);
            if (activeToken) {
                router.replace(`/f/invite/${activeToken}`);
                return;
            }
        } catch {}

        setState('dispensing');

        try {
            const res = await fetch(`/api/scan/${encodeURIComponent(id)}/dispense`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 410) {
                    setState('revoked');
                    setErrorMessage(data.message || 'This counter QR code has been retired or is no longer active.');
                    return;
                }
                setState('error');
                setErrorMessage(data.message || 'Failed to prepare feedback link.');
                return;
            }

            if (data.token) {
                try {
                    sessionStorage.setItem(`active_counter_token_${id}`, data.token);
                } catch {}
                router.replace(data.path || `/f/invite/${data.token}`);
            } else {
                setState('error');
                setErrorMessage('Invalid response from server.');
            }
        } catch (err: any) {
            console.error('Counter QR scan error:', err);
            setState('error');
            setErrorMessage(err.message || 'Network error while loading feedback.');
        }
    };

    useEffect(() => {
        startDispense();
    }, [id]);

    if (state === 'checking' || state === 'dispensing') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="flex flex-col items-center max-w-xs text-center space-y-4">
                    <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <ShieldCheck className="h-7 w-7 text-primary animate-pulse" />
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold">Opening Feedback Form</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Preparing your private, 1-time feedback session...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (state === 'already_submitted') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-sm text-center shadow-sm">
                    <CardContent className="pt-8 pb-6 px-6 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-xl font-bold">Feedback Already Received</h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                You have already submitted feedback for this visit. Thank you for taking the time to share your thoughts!
                            </p>
                        </div>
                        <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                            <span>To keep reviews authentic, only 1 submission is allowed per customer visit.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (state === 'revoked') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-sm text-center shadow-sm">
                    <CardContent className="pt-8 pb-6 px-6 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="space-y-1.5">
                            <h2 className="text-lg font-bold">QR Code Retired</h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {errorMessage}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-sm text-center shadow-sm">
                <CardContent className="pt-8 pb-6 px-6 space-y-4">
                    <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-950/60 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-lg font-bold">Unable to Open Form</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {errorMessage || 'Something went wrong while dispensing your feedback link.'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={startDispense}
                        className="w-full text-xs gap-1.5"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Try Again
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

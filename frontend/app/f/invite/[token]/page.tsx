"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Star, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteMeta {
    product_id?: string;
    product_name?: string;
    industry?: string;
    token?: string;
}

type PageState = 'loading' | 'active' | 'already_submitted' | 'device_cooldown' | 'invalid' | 'success';

export default function SingleUseFeedbackPage() {
    const params = useParams();
    const token = params.token as string;

    const [pageState, setPageState] = useState<PageState>('loading');
    const [meta, setMeta] = useState<InviteMeta | null>(null);

    const [feedbackText, setFeedbackText] = useState('');
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadInviteMeta = async () => {
            if (!token) {
                setPageState('invalid');
                return;
            }

            try {
                const response = await fetch(`/api/invite-feedback/${encodeURIComponent(token)}`);
                const data = await response.json().catch(() => ({}));

                if (!isMounted) return;

                if (!response.ok) {
                    const msg = (data.message || '').toLowerCase();
                    if (response.status === 410 || response.status === 409 || msg.includes('already')) {
                        setPageState('already_submitted');
                    } else {
                        setPageState('invalid');
                    }
                    return;
                }

                // Anti-Spam Layer 1: Check 30-day device cooldown for this product
                if (data.product_id) {
                    try {
                        const lastSubmittedStr = localStorage.getItem(`product_submitted_${data.product_id}`);
                        if (lastSubmittedStr) {
                            const lastSubmitted = parseInt(lastSubmittedStr, 10);
                            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
                            if (!isNaN(lastSubmitted) && Date.now() - lastSubmitted < THIRTY_DAYS_MS) {
                                setMeta(data);
                                setPageState('device_cooldown');
                                return;
                            }
                        }
                    } catch {
                        // Ignore private browsing storage restrictions
                    }
                }

                setMeta(data);
                setPageState('active');
            } catch (err) {
                console.error('Invite meta load error', err);
                if (isMounted) setPageState('invalid');
            }
        };

        loadInviteMeta();

        return () => {
            isMounted = false;
        };
    }, [token]);

    const handleSubmit = async () => {
        if (!token || !feedbackText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const payload = {
                feedback: feedbackText.trim(),
                rating,
                email: email.trim() || undefined,
            };

            const response = await fetch(`/api/invite-feedback/${encodeURIComponent(token)}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                const msg = result.message || 'Failed to submit feedback';
                if (response.status === 409 || response.status === 410 || msg.includes('already')) {
                    setPageState('already_submitted');
                }
                throw new Error(msg);
            }

            setPageState('success');
            if (meta?.product_id) {
                try {
                    localStorage.setItem(`product_submitted_${meta.product_id}`, Date.now().toString());
                    localStorage.setItem(`counter_submitted_${meta.product_id}`, Date.now().toString());
                } catch {}
            }
            toast({
                title: 'Feedback Submitted',
                description: 'Thank you! Your feedback has been safely received.',
            });
        } catch (error: any) {
            console.error('Submit error:', error);
            toast({
                title: 'Submission Error',
                description: error.message || 'Failed to submit feedback. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (pageState === 'loading') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Loading feedback form...</p>
            </div>
        );
    }

    if (pageState === 'device_cooldown') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-2 shadow-sm">
                    <CardContent className="pt-8 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Feedback Already Recorded</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            You have already submitted feedback for <strong>{meta?.product_name || 'this product'}</strong>. Thank you for your support!
                        </p>
                        <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 shrink-0" />
                            <span>To maintain authentic customer insights, submissions are limited to once every 30 days per customer.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (pageState === 'already_submitted') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-2 shadow-sm">
                    <CardContent className="pt-8 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Already Submitted</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Thank you! Your feedback for this one-time link has already been received.
                        </p>
                        <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 shrink-0" />
                            <span>This single-use link is closed and cannot be resubmitted.</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (pageState === 'invalid') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-2 shadow-sm">
                    <CardContent className="pt-8 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold">Link Not Found</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            This feedback link is invalid or no longer active.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (pageState === 'success') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md text-center p-2 shadow-sm">
                    <CardContent className="pt-8 space-y-4">
                        <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold">Thank You!</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Your feedback has been submitted successfully.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
            <Card className="w-full max-w-md shadow-sm">
                <CardHeader className="space-y-1 pb-4">
                    <CardTitle className="text-xl font-bold">
                        {meta?.product_name ? `Feedback for ${meta.product_name}` : 'Submit Feedback'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                        We value your feedback. Please share your thoughts below.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedback" className="text-sm font-medium">Your Feedback *</Label>
                        <Textarea
                            id="feedback"
                            placeholder="Tell us about your experience..."
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            rows={4}
                            className="resize-none text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Rating (optional)</Label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(rating === star ? undefined : star)}
                                    className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                >
                                    <Star
                                        className={`h-6 w-6 ${
                                            rating && star <= rating
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-muted-foreground'
                                        }`}
                                    />
                                </button>
                            ))}
                            {rating && (
                                <span className="text-sm text-muted-foreground ml-2">
                                    {rating}/5
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">Email (optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com (leave blank for anonymous)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={!feedbackText.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Submit Feedback
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

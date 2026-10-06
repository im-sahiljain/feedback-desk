"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PublicFeedbackMeta {
    product_name?: string;
    industry?: string;
    token?: string;
}

export default function OpaquePublicFeedbackPage() {
    const params = useParams();
    const token = params.token as string;

    const [meta, setMeta] = useState<PublicFeedbackMeta | null>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const loadMeta = async () => {
            try {
                const response = await fetch(`/api/public-feedback/${encodeURIComponent(token)}`);
                if (!response.ok) {
                    setIsValid(false);
                    return;
                }
                const data = await response.json();
                setMeta(data);
                setIsValid(true);
            } catch (error) {
                console.error('Validation error', error);
                setIsValid(false);
            } finally {
                setIsValidating(false);
            }
        };

        if (token) {
            loadMeta();
        } else {
            setIsValid(false);
            setIsValidating(false);
        }
    }, [token]);

    if (isValidating) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isValid) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center space-y-4">
                        <h2 className="text-2xl font-bold">Page Not Found</h2>
                        <p className="text-muted-foreground">
                            The link you used is invalid or no longer active. Please check the URL and try again.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!token || !feedbackText.trim()) return;

        setIsSubmitting(true);
        try {
            const payload = {
                feedback: feedbackText.trim(),
                rating,
                email: email.trim() || undefined,
            };

            const response = await fetch(`/api/public-feedback/${encodeURIComponent(token)}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to submit feedback');
            }

            setIsSuccess(true);
            toast({
                title: 'Feedback Submitted!',
                description: 'Thank you for your feedback.',
            });

            setFeedbackText('');
            setRating(undefined);
            setEmail('');
        } catch (error: any) {
            console.error('Submit error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to submit feedback. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <Send className="h-6 w-6 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold">Thank You!</h2>
                        <p className="text-muted-foreground">
                            Your feedback has been submitted successfully.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>
                        {meta?.product_name ? `Feedback for ${meta.product_name}` : 'Submit Feedback'}
                    </CardTitle>
                    <CardDescription>
                        We value your feedback. Please let us know your thoughts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="feedback">Your Feedback *</Label>
                        <Textarea
                            id="feedback"
                            placeholder="Tell us what you think..."
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Rating (optional)</Label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(rating === star ? undefined : star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                >
                                    <Star
                                        className={`h-6 w-6 ${rating && star <= rating
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
                        <Label htmlFor="email">Email (optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
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

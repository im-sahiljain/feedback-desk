"use client";

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PublicFeedbackPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const productId = params.productId as string;
    const userId = params.userId as string;
    const industry = params.industry as string;
    const signature = searchParams.get('sig');

    const [feedbackText, setFeedbackText] = useState('');
    const [rating, setRating] = useState<number | undefined>(undefined);
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const validatePath = async () => {
            try {
                const response = await fetch('/api/validate-public-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId, userId, industry, signature })
                });

                const data = await response.json();
                setIsValid(data.valid);
            } catch (error) {
                console.error("Validation error", error);
                setIsValid(false);
            } finally {
                setIsValidating(false);
            }
        };

        if (productId && userId && industry && signature) {
            validatePath();
        } else {
            setIsValid(false);
            setIsValidating(false);
        }
    }, [productId, userId, industry, signature]);



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
                            The link you used is invalid or expired. Please check the URL and try again.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleSubmit = async () => {
        if (!productId || !feedbackText.trim()) return;

        setIsSubmitting(true);
        try {
            // Backend expects: { product_id, feedback, email, rating }
            // We also include user_id and industry from URL as per requirement, 
            // passing them to backend in case it uses them.
            const payload = {
                product_id: productId,
                feedback: feedbackText.trim(),
                rating,
                email: email.trim() || undefined,
                user_id: userId,
                industry: decodeURIComponent(industry),
            };

            const response = await fetch('/api/feedbacks/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            setIsSuccess(true);
            toast({
                title: 'Feedback Submitted!',
                description: 'Thank you for your feedback.',
            });

            // Reset form
            setFeedbackText('');
            setRating(undefined);
            setEmail('');

        } catch (error) {
            console.error('Submit error:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit feedback. Please try again.',
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
                    <CardTitle>Submit Feedback</CardTitle>
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
                                            ? 'text-yellow-400 fill-yellow-400' // Hardcode colors as 'warning' might be custom class
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

"use client";

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MessageSquare, ThumbsUp, ThumbsDown, Minus, Loader2, Send, Star, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sentiment, Priority } from '@/types';

export default function Feedback() {
  const { currentProduct, getProductFeedback, addFeedback, userRole } = useApp();
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const productFeedback = currentProduct ? getProductFeedback(currentProduct.id) : [];

  const filteredFeedback = productFeedback.filter(fb => {
    if (sentimentFilter !== 'all' && fb.analysis?.sentiment !== sentimentFilter) return false;
    if (priorityFilter !== 'all' && fb.analysis?.priority !== priorityFilter) return false;
    return true;
  });

  const handleSubmit = async () => {
    if (!currentProduct || !feedbackText.trim()) return;

    setIsSubmitting(true);
    try {
      await addFeedback({
        productId: currentProduct.id,
        text: feedbackText.trim(),
        rating,
        email: email.trim() || undefined,
      });

      setFeedbackText('');
      setRating(undefined);
      setEmail('');

      toast({
        title: 'Feedback Submitted!',
        description: 'AI is analyzing your feedback...',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentProduct) {
    return (
      <AppLayout title="Feedback">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">📦</div>
            <h2 className="text-xl font-semibold">No Product Selected</h2>
            <p className="text-muted-foreground">
              Select a product from the sidebar to view and submit feedback
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Feedback" description={`Collect and view feedback for ${currentProduct.name}`}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Feedback Form */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Submit Feedback</CardTitle>
              <CardDescription>
                Share your thoughts about {currentProduct.name}
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
                            ? 'text-warning fill-warning'
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

        {/* Feedback List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          {userRole === 'admin' && (
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>
                  <Select
                    value={sentimentFilter}
                    onValueChange={value => setSentimentFilter(value as Sentiment | 'all')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiment</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={priorityFilter}
                    onValueChange={value => setPriorityFilter(value as Priority | 'all')}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary" className="ml-auto">
                    {filteredFeedback.length} of {productFeedback.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Items */}
          {filteredFeedback.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Feedback Yet</h3>
                <p className="text-muted-foreground">
                  {productFeedback.length === 0
                    ? 'Be the first to submit feedback!'
                    : 'No feedback matches your filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map(fb => (
                <Card key={fb.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Sentiment Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {fb.isAnalyzing ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : fb.analysis?.sentiment === 'positive' ? (
                          <ThumbsUp className="h-5 w-5 text-success" />
                        ) : fb.analysis?.sentiment === 'negative' ? (
                          <ThumbsDown className="h-5 w-5 text-destructive" />
                        ) : (
                          <Minus className="h-5 w-5 text-warning" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <p className="text-sm">{fb.text}</p>

                        {/* AI Analysis */}
                        {fb.isAnalyzing ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            AI is analyzing...
                          </div>
                        ) : fb.analysis && (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground italic">
                              "{fb.analysis.summary}"
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant={
                                  fb.analysis.sentiment === 'positive'
                                    ? 'default'
                                    : fb.analysis.sentiment === 'negative'
                                      ? 'destructive'
                                      : 'secondary'
                                }
                                className="capitalize text-xs"
                              >
                                {fb.analysis.sentiment}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {fb.analysis.category}
                              </Badge>
                              <Badge
                                variant={fb.analysis.priority === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs capitalize"
                              >
                                {fb.analysis.priority} priority
                              </Badge>
                            </div>
                          </div>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {fb.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              {fb.rating}/5
                            </span>
                          )}
                          {fb.email && <span>{fb.email}</span>}
                          <span>{new Date(fb.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

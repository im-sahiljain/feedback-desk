"use client";

import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { INDUSTRY_ICONS, INDUSTRY_LABELS } from '@/types';
import { TrendingUp, TrendingDown, MessageSquare, AlertTriangle, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { products, feedback, currentProduct, getProductFeedback } = useApp();

  const productFeedback = currentProduct ? getProductFeedback(currentProduct.id) : [];

  const stats = {
    total: productFeedback.length,
    positive: productFeedback.filter(f => f.analysis?.sentiment === 'positive').length,
    negative: productFeedback.filter(f => f.analysis?.sentiment === 'negative').length,
    neutral: productFeedback.filter(f => f.analysis?.sentiment === 'neutral').length,
    highPriority: productFeedback.filter(f => f.analysis?.priority === 'high').length,
    avgRating: productFeedback.filter(f => f.rating).reduce((acc, f) => acc + (f.rating || 0), 0) /
      (productFeedback.filter(f => f.rating).length || 1),
  };

  const sentimentData = [
    { name: 'Positive', value: stats.positive, color: 'hsl(var(--success))' },
    { name: 'Neutral', value: stats.neutral, color: 'hsl(var(--warning))' },
    { name: 'Negative', value: stats.negative, color: 'hsl(var(--destructive))' },
  ];

  const categoryData = productFeedback.reduce((acc, f) => {
    const category = f.analysis?.category || 'Uncategorized';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: category, count: 1 });
    }
    return acc;
  }, [] as { name: string; count: number }[]).sort((a, b) => b.count - a.count).slice(0, 5);

  const recentFeedback = productFeedback.slice(0, 5);

  if (!currentProduct) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="text-6xl">📦</div>
            <h2 className="text-xl font-semibold">No Product Selected</h2>
            <p className="text-muted-foreground">
              Select a product from the sidebar to view insights
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" description={`Overview for ${currentProduct.name}`}>
      <div className="space-y-6">
        {/* Product Info Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{INDUSTRY_ICONS[currentProduct.industry]}</span>
              <div>
                <CardTitle className="text-xl">{currentProduct.name}</CardTitle>
                <CardDescription>{currentProduct.description}</CardDescription>
              </div>
              <Badge variant="outline" className="ml-auto">
                {INDUSTRY_LABELS[currentProduct.industry]}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Feedback</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Positive</p>
                  <p className="text-2xl font-bold text-success">{stats.positive}</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-success/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Negative</p>
                  <p className="text-2xl font-bold text-destructive">{stats.negative}</p>
                </div>
                <ThumbsDown className="h-8 w-8 text-destructive/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold text-warning">{stats.highPriority}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sentiment Distribution</CardTitle>
              <CardDescription>Overall feedback sentiment breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {sentimentData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Categories</CardTitle>
              <CardDescription>Most common feedback categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Feedback</CardTitle>
            <CardDescription>Latest feedback with AI analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFeedback.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No feedback yet. Submit some feedback to see insights!
                </p>
              ) : (
                recentFeedback.map(fb => (
                  <div
                    key={fb.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {fb.analysis?.sentiment === 'positive' && <ThumbsUp className="h-5 w-5 text-success" />}
                      {fb.analysis?.sentiment === 'negative' && <ThumbsDown className="h-5 w-5 text-destructive" />}
                      {fb.analysis?.sentiment === 'neutral' && <Minus className="h-5 w-5 text-warning" />}
                      {!fb.analysis && <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{fb.text}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {fb.analysis && (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {fb.analysis.category}
                            </Badge>
                            <Badge
                              variant={fb.analysis.priority === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs capitalize"
                            >
                              {fb.analysis.priority} priority
                            </Badge>
                          </>
                        )}
                        {fb.rating && (
                          <Badge variant="outline" className="text-xs">
                            ⭐ {fb.rating}/5
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(fb.createdAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

"use client";

import { useApp } from '@/context/AppContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, ThumbsUp, ThumbsDown, Minus, BarChart3, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

export default function Insights() {
  const { currentProduct, getProductFeedback } = useApp();

  const productFeedback = currentProduct ? getProductFeedback(currentProduct.id) : [];
  const analyzedFeedback = productFeedback.filter(f => f.analysis);

  // Stats calculations
  const stats = {
    total: productFeedback.length,
    analyzed: analyzedFeedback.length,
    positive: analyzedFeedback.filter(f => f.analysis?.sentiment === 'positive').length,
    negative: analyzedFeedback.filter(f => f.analysis?.sentiment === 'negative').length,
    neutral: analyzedFeedback.filter(f => f.analysis?.sentiment === 'neutral').length,
    highPriority: analyzedFeedback.filter(f => f.analysis?.priority === 'high').length,
    mediumPriority: analyzedFeedback.filter(f => f.analysis?.priority === 'medium').length,
    lowPriority: analyzedFeedback.filter(f => f.analysis?.priority === 'low').length,
    avgRating: productFeedback.filter(f => f.rating).length > 0
      ? productFeedback.filter(f => f.rating).reduce((acc, f) => acc + (f.rating || 0), 0) /
      productFeedback.filter(f => f.rating).length
      : 0,
  };

  const sentimentScore = stats.analyzed > 0
    ? ((stats.positive - stats.negative) / stats.analyzed * 100).toFixed(0)
    : 0;

  // Chart data
  const sentimentData = [
    { name: 'Positive', value: stats.positive, color: 'hsl(var(--success))' },
    { name: 'Neutral', value: stats.neutral, color: 'hsl(var(--warning))' },
    { name: 'Negative', value: stats.negative, color: 'hsl(var(--destructive))' },
  ];

  const priorityData = [
    { name: 'High', value: stats.highPriority, color: 'hsl(var(--destructive))' },
    { name: 'Medium', value: stats.mediumPriority, color: 'hsl(var(--warning))' },
    { name: 'Low', value: stats.lowPriority, color: 'hsl(var(--info))' },
  ];

  const categoryData = analyzedFeedback.reduce((acc, f) => {
    const category = f.analysis?.category || 'Uncategorized';
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.count++;
      if (f.analysis?.sentiment === 'positive') existing.positive++;
      if (f.analysis?.sentiment === 'negative') existing.negative++;
    } else {
      acc.push({
        name: category,
        count: 1,
        positive: f.analysis?.sentiment === 'positive' ? 1 : 0,
        negative: f.analysis?.sentiment === 'negative' ? 1 : 0,
      });
    }
    return acc;
  }, [] as { name: string; count: number; positive: number; negative: number }[]).sort((a, b) => b.count - a.count);

  // Mock trend data (last 7 days)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayFeedback = productFeedback.filter(f => {
      const fbDate = new Date(f.createdAt);
      return fbDate.toDateString() === date.toDateString();
    });
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      total: dayFeedback.length + Math.floor(Math.random() * 3),
      positive: dayFeedback.filter(f => f.analysis?.sentiment === 'positive').length + Math.floor(Math.random() * 2),
    };
  });

  // Top issues (negative + high priority)
  const topIssues = analyzedFeedback
    .filter(f => f.analysis?.sentiment === 'negative' && f.analysis?.priority === 'high')
    .slice(0, 5);

  if (!currentProduct) {
    return (
      <AppLayout title="Insights">
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
    <AppLayout title="Insights" description={`Analytics for ${currentProduct.name}`}>
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
              </div>
            </CardContent>
          </Card>

          <Card className={Number(sentimentScore) >= 0 ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {Number(sentimentScore) >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                  <p className={`text-3xl font-bold ${Number(sentimentScore) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {sentimentScore}%
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">Sentiment Score</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-5 w-5 text-warning fill-warning" />
                  <p className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</p>
                </div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">{stats.positive}</p>
                <p className="text-sm text-muted-foreground">Positive</p>
              </div>
            </CardContent>
          </Card>

          <Card className={stats.highPriority > 0 ? 'border-destructive/30 bg-destructive/5' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {stats.highPriority > 0 && <AlertTriangle className="h-5 w-5 text-destructive" />}
                  <p className={`text-3xl font-bold ${stats.highPriority > 0 ? 'text-destructive' : ''}`}>
                    {stats.highPriority}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Sentiment Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sentiment Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
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
              <div className="flex justify-center gap-3 mt-2">
                {sentimentData.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
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
              <div className="flex justify-center gap-3 mt-2">
                {priorityData.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">7-Day Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Analysis</CardTitle>
            <CardDescription>Feedback distribution by category with sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No categorized feedback yet
                </p>
              ) : (
                categoryData.map(cat => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-success flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {cat.positive}
                        </span>
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <ThumbsDown className="h-3 w-3" /> {cat.negative}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {cat.count} total
                        </Badge>
                      </div>
                    </div>
                    <Progress
                      value={(cat.count / stats.analyzed) * 100}
                      className="h-2"
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Issues */}
        {topIssues.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base">Top Issues to Address</CardTitle>
              </div>
              <CardDescription>High-priority negative feedback requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topIssues.map((fb, index) => (
                  <div
                    key={fb.id}
                    className="flex gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <span className="text-lg font-bold text-destructive">#{index + 1}</span>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm">{fb.text}</p>
                      {fb.analysis && (
                        <p className="text-sm text-muted-foreground italic">
                          AI Summary: {fb.analysis.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {fb.analysis?.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

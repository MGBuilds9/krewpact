'use client';

import { BarChart3, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Analytics {
  total_generated: number;
  total_dismissed: number;
  total_acted_on: number;
  dismiss_rate: number;
  action_rate: number;
  by_type: Record<string, { total: number; dismissed: number; acted_on: number }>;
  total_ai_cost_cents: number;
}

export function InsightAnalyticsCard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch('/api/ai/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { analytics?: Analytics } | null) => {
        if (data?.analytics) setAnalytics(data.analytics);
      })
      .catch(() => {});
  }, []);

  if (!analytics) return null;

  const insightTypes = Object.entries(analytics.by_type).sort((a, b) => b[1].total - a[1].total);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          AI Insight Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{analytics.total_generated}</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" /> Generated
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{analytics.action_rate}%</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Action Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{analytics.dismiss_rate}%</div>
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <XCircle className="h-3 w-3" /> Dismiss Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              ${(analytics.total_ai_cost_cents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Total AI Cost</div>
          </div>
        </div>

        {insightTypes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">By Insight Type</h4>
            <div className="space-y-1">
              {insightTypes.map(([type, counts]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    {counts.total} total · {counts.acted_on} acted · {counts.dismissed} dismissed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

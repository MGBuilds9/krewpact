'use client';

import { Calendar, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QuarterlyData } from '@/lib/crm/construction-intelligence';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

interface SeasonalAnalysisCardProps {
  quarters: QuarterlyData[];
}

export function SeasonalAnalysisCard({ quarters }: SeasonalAnalysisCardProps) {
  if (quarters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Seasonal Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No seasonal data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxCreated = Math.max(...quarters.map((q) => q.created), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Seasonal Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quarters.map((q, idx) => {
          const prev = idx > 0 ? quarters[idx - 1] : null;
          const trend = prev
            ? q.created > prev.created
              ? 'up'
              : q.created < prev.created
                ? 'down'
                : 'flat'
            : 'flat';

          const barWidth = Math.max((q.created / maxCreated) * 100, 4);

          return (
            <div key={q.quarter} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium w-20">{q.quarter}</span>
                  {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                  {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {trend === 'flat' && <Minus className="h-3 w-3 text-gray-400" />}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{q.created} created</span>
                  <span className="text-green-600">{q.won} won</span>
                  <span className="text-red-500">{q.lost} lost</span>
                  <span className="font-medium text-foreground">{formatCurrency(q.revenue)}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

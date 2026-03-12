'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';
import type { WinLossEntry } from '@/lib/crm/pipeline-intelligence';

type EnrichedWinLossEntry = WinLossEntry & { name?: string };

interface WinLossAnalysisProps {
  title?: string;
  data: EnrichedWinLossEntry[];
  isLoading?: boolean;
}

export function WinLossAnalysis({
  title = 'Win/Loss Analysis',
  data,
  isLoading,
}: WinLossAnalysisProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((entry) => (
              <div key={entry.dimension} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">
                    {entry.name ??
                      (entry.dimension === 'unassigned'
                        ? 'Unassigned'
                        : entry.dimension.slice(0, 12))}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {entry.won}W / {entry.lost}L ({Math.round(entry.win_rate * 100)}%)
                  </span>
                </div>
                <Progress value={entry.win_rate * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

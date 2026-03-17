'use client';

import { FolderKanban } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectPortfolio } from '@/lib/executive/metrics';

interface DivisionScorecardProps {
  portfolio?: ProjectPortfolio;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  planning: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function DivisionScorecard({ portfolio, isLoading }: DivisionScorecardProps) {
  if (isLoading) {
    return <Skeleton className="h-48 rounded-2xl" />;
  }

  const total = portfolio?.statusBreakdown.reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          Project Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No project data available</p>
        ) : (
          <>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground -mt-1">Total projects</p>
            {portfolio && portfolio.statusBreakdown.length > 0 && (
              <div className="space-y-2">
                {portfolio.statusBreakdown.map(({ status, count }) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colorClass =
                    statusColors[status] ??
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <Badge className={`text-xs border-0 capitalize flex-shrink-0 ${colorClass}`}>
                        {status.replace('_', ' ')}
                      </Badge>
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-primary/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

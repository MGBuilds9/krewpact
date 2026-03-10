'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Alert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count?: number;
  created_at: string;
}

interface AlertsRibbonProps {
  alerts: Alert[];
  isLoading: boolean;
}

const severityConfig = {
  high: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: 'High',
  },
  medium: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    label: 'Medium',
  },
  low: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Low',
  },
};

export function AlertsRibbon({ alerts, isLoading }: AlertsRibbonProps) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-64 flex-shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">No action items — all systems clear</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {alerts.map((alert, idx) => {
        const config = severityConfig[alert.severity];
        return (
          <Card
            key={idx}
            className={cn(
              'rounded-2xl border-0 shadow-sm bg-white dark:bg-card flex-shrink-0 w-72 border-l-4',
              config.border,
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <p className="text-sm font-semibold truncate">{alert.title}</p>
                </div>
                <Badge className={cn('text-xs flex-shrink-0 border-0', config.badge)}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                {alert.description}
                {alert.count !== undefined && alert.count > 0 && ` (${alert.count})`}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

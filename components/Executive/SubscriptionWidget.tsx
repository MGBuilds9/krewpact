'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Clock } from 'lucide-react';
import type { SubscriptionSummary } from '@/lib/executive/metrics';

interface SubscriptionWidgetProps {
  summary?: SubscriptionSummary;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function SubscriptionWidget({ summary, isLoading }: SubscriptionWidgetProps) {
  if (isLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!summary ? (
          <p className="text-sm text-muted-foreground">No subscription data available</p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold">{formatCurrency(summary.totalMonthlyCost)}</p>
              <p className="text-xs text-muted-foreground pb-1">/ month</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {summary.activeCount}
                </Badge>
                <span className="text-xs text-muted-foreground">active</span>
              </div>
              {summary.upcomingRenewals > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    {summary.upcomingRenewals}
                  </Badge>
                  <span className="text-xs text-muted-foreground">renewing in 7 days</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

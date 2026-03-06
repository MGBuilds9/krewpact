'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { RepPerformance } from '@/lib/crm/pipeline-intelligence';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface RepPerformanceCardProps {
  data: RepPerformance[];
  isLoading?: boolean;
}

export function RepPerformanceCard({ data, isLoading }: RepPerformanceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rep Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
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
          <Users className="h-4 w-4" />
          Rep Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((rep, index) => (
              <div key={rep.user_id} className="flex items-center gap-3 py-1">
                <span className="text-sm font-bold text-muted-foreground w-5">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {rep.user_id === 'unassigned' ? 'Unassigned' : rep.user_id.slice(0, 8)}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{rep.deals_won} won</span>
                    <span>{rep.deals_lost} lost</span>
                    <span>{rep.deals_open} open</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatCurrency(rep.revenue_closed)}</p>
                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    {Math.round(rep.conversion_rate * 100)}% win rate
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

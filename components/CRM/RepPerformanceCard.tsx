'use client';

import { AlertCircle, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsers } from '@/hooks/useUsers';
import type { RepPerformance } from '@/lib/crm/pipeline-intelligence';
import { formatCurrency } from '@/lib/format/currency';

interface RepPerformanceCardProps {
  data: RepPerformance[];
  isLoading?: boolean;
}

const UNASSIGNED_ID = 'unassigned';

export function RepPerformanceCard({ data, isLoading }: RepPerformanceCardProps) {
  const { data: users } = useUsers();
  const userNameMap = new Map(
    (users ?? []).map((u) => [
      u.id,
      [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    ]),
  );

  // Split the unassigned sentinel out of the ranked list. Rendering it as a
  // regular row with a "0% win rate" badge is nonsense — an unowned deal
  // doesn't have a rep whose win rate is being measured. The sentinel comes
  // from `lib/crm/pipeline-intelligence.ts` which keeps it for aggregation
  // purposes; the display layer is the right place to peel it off.
  const unassigned = data.find((r) => r.user_id === UNASSIGNED_ID);
  const reps = data.filter((r) => r.user_id !== UNASSIGNED_ID);

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
      <CardContent className="space-y-3">
        {unassigned && unassigned.deals_open > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900/40 dark:bg-amber-950/30">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                {unassigned.deals_open} unassigned{' '}
                {unassigned.deals_open === 1 ? 'opportunity' : 'opportunities'}
                {unassigned.revenue_closed > 0
                  ? ` worth ${formatCurrency(unassigned.revenue_closed)}`
                  : ''}
              </p>
              <p className="text-amber-700 dark:text-amber-300/80">
                Assign now to track ownership.
              </p>
            </div>
          </div>
        )}
        {reps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
        ) : (
          <div className="space-y-3">
            {reps.map((rep, index) => (
              <div key={rep.user_id} className="flex items-center gap-3 py-1">
                <span className="text-sm font-bold text-muted-foreground w-5">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {userNameMap.get(rep.user_id) ?? rep.user_id.slice(0, 8)}
                  </p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{rep.deals_won} won</span>
                    <span>{rep.deals_lost} lost</span>
                    <span>{rep.deals_open} open</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatCurrency(rep.revenue_closed)}</p>
                  <Badge variant="outline" className="text-xs">
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

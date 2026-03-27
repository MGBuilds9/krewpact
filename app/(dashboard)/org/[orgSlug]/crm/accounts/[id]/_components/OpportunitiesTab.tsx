'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { useOpportunities } from '@/hooks/useCRM';

type OppItem = NonNullable<ReturnType<typeof useOpportunities>['data']>['data'][number];

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

interface OpportunitiesTabProps {
  opps: OppItem[];
  orgPush: (path: string) => void;
}

export function OpportunitiesTab({ opps, orgPush }: OpportunitiesTabProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        {opps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No opportunities linked to this account</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opps.map((opp) => (
              <div
                key={opp.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => orgPush(`/crm/opportunities/${opp.id}`)}
              >
                <div>
                  <div className="font-medium text-sm">{opp.opportunity_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {opp.stage.replace('_', ' ')}
                  </div>
                </div>
                <div className="text-sm font-medium">{formatCurrency(opp.estimated_revenue)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

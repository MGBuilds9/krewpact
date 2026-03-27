'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useOpportunity } from '@/hooks/useCRM';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';
import { formatStatus } from '@/lib/format-status';

type OppData = NonNullable<ReturnType<typeof useOpportunity>['data']>;

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface DealSummaryCardProps {
  opp: OppData;
  currentStage: OpportunityStage;
  activityCount: number;
  estimateCount: number;
}

export function DealSummaryCard({
  opp,
  currentStage,
  activityCount,
  estimateCount,
}: DealSummaryCardProps) {
  const weightedValue = (opp.estimated_revenue ?? 0) * ((opp.probability_pct ?? 0) / 100);
  const targetClose = opp.target_close_date
    ? new Date(opp.target_close_date).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
      })
    : '-';
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Deal Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-medium">{formatCurrency(opp.estimated_revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Weighted Value</span>
          <span className="font-medium">{formatCurrency(weightedValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Probability</span>
          <span>{opp.probability_pct ?? 0}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Target Close</span>
          <span>{targetClose}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stage</span>
          <span>{formatStatus(currentStage)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Activities</span>
          <span>{activityCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Estimates</span>
          <span>{estimateCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

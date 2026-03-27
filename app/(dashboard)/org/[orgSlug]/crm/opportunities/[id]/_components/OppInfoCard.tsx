'use client';

import { OpportunityForm } from '@/components/CRM/OpportunityForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useOpportunity } from '@/hooks/useCRM';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';
import { formatStatus } from '@/lib/format-status';

type OppData = NonNullable<ReturnType<typeof useOpportunity>['data']>;

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface OppInfoCardProps {
  opp: OppData;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  currentStage: OpportunityStage;
}

export function OppInfoCard({ opp, isEditing, setIsEditing, currentStage }: OppInfoCardProps) {
  const closeDate = opp.target_close_date
    ? new Date(opp.target_close_date).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';
  const createdDate = new Date(opp.created_at).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Opportunity' : 'Opportunity Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <OpportunityForm
            opportunity={opp}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Stage</dt>
              <dd className="text-sm">{formatStatus(currentStage)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Estimated Revenue</dt>
              <dd className="text-sm">{formatCurrency(opp.estimated_revenue)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Probability</dt>
              <dd className="text-sm">
                {opp.probability_pct != null ? `${opp.probability_pct}%` : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Target Close</dt>
              <dd className="text-sm">{closeDate}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">{createdDate}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

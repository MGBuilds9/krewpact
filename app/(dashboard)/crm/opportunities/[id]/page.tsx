'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, XCircle, Pencil } from 'lucide-react';
import { useOpportunity, useActivities, useOpportunityStageTransition } from '@/hooks/useCRM';
import { OpportunityStageProgressBar } from '@/components/CRM/OpportunityStageProgressBar';
import { OpportunityForm } from '@/components/CRM/OpportunityForm';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/opportunity-stages';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;
  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: activities } = useActivities({ opportunityId });
  const stageTransition = useOpportunityStageTransition();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Opportunity not found</h2>
        <p className="text-muted-foreground mb-4">
          This opportunity may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push('/crm/opportunities')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Opportunities
        </Button>
      </div>
    );
  }

  const currentStage = opportunity.stage as OpportunityStage;
  const nextStages = ALLOWED_TRANSITIONS[currentStage] || [];
  const nextRegularStage = nextStages.find((s) => s !== 'closed_lost');
  const canMarkLost = nextStages.includes('closed_lost');

  function handleNextStage() {
    if (!nextRegularStage) return;
    stageTransition.mutate({ id: opportunityId, stage: nextRegularStage });
  }

  function handleMarkLost() {
    const reason = window.prompt('Reason for closing this opportunity:');
    if (reason) {
      stageTransition.mutate({ id: opportunityId, stage: 'closed_lost', lost_reason: reason });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/crm/opportunities')}
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{opportunity.opportunity_name}</h1>
          <p className="text-muted-foreground">
            {formatCurrency(opportunity.estimated_revenue)} | {opportunity.probability_pct ?? 0}% probability
          </p>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* Stage Progress */}
      <Card>
        <CardContent className="pt-6">
          <OpportunityStageProgressBar currentStage={currentStage} />
          <div className="flex gap-2 mt-4 justify-end">
            {nextRegularStage && (
              <Button
                size="sm"
                onClick={handleNextStage}
                disabled={stageTransition.isPending}
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                {nextRegularStage.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Button>
            )}
            {canMarkLost && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleMarkLost}
                disabled={stageTransition.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Mark Lost
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card / Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Opportunity' : 'Opportunity Information'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <OpportunityForm
              opportunity={opportunity}
              onSuccess={() => setIsEditing(false)}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Stage</dt>
                <dd className="text-sm capitalize">{currentStage.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Estimated Revenue</dt>
                <dd className="text-sm">{formatCurrency(opportunity.estimated_revenue)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Probability</dt>
                <dd className="text-sm">{opportunity.probability_pct != null ? `${opportunity.probability_pct}%` : '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Target Close</dt>
                <dd className="text-sm">
                  {opportunity.target_close_date
                    ? new Date(opportunity.target_close_date).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="text-sm">
                  {new Date(opportunity.created_at).toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={activities ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

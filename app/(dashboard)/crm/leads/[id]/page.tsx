'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, XCircle, Zap } from 'lucide-react';
import { useLead, useActivities, useLeadStageTransition, useCreateOpportunity } from '@/hooks/useCRM';
import { StageProgressBar } from '@/components/CRM/StageProgressBar';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/lead-stages';
import type { LeadStage } from '@/lib/crm/lead-stages';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { data: lead, isLoading } = useLead(leadId);
  const { data: activities } = useActivities({ leadId });
  const stageTransition = useLeadStageTransition();
  const createOpportunity = useCreateOpportunity();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Lead not found</h2>
        <p className="text-muted-foreground mb-4">
          This lead may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push('/crm/leads')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const currentStage = lead.stage as LeadStage;
  const nextStages = ALLOWED_TRANSITIONS[currentStage] || [];
  const nextRegularStage = nextStages.find((s) => s !== 'lost');
  const canMarkLost = nextStages.includes('lost');

  function handleNextStage() {
    if (!nextRegularStage) return;
    stageTransition.mutate({ id: leadId, stage: nextRegularStage });
  }

  function handleMarkLost() {
    const reason = window.prompt('Reason for losing this lead:');
    if (reason) {
      stageTransition.mutate({ id: leadId, stage: 'lost', lost_reason: reason });
    }
  }

  function handleConvertToOpportunity() {
    if (!lead) return;
    createOpportunity.mutate(
      {
        opportunity_name: lead.lead_name,
        lead_id: lead.id,
        division_id: lead.division_id,
        estimated_revenue: lead.estimated_value,
      },
      {
        onSuccess: (data) => {
          if (data && typeof data === 'object' && 'id' in data) {
            router.push(`/crm/opportunities`);
          }
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/crm/leads')}
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{lead.lead_name}</h1>
          {lead.company_name && (
            <p className="text-muted-foreground">{lead.company_name}</p>
          )}
        </div>
      </div>

      {/* Stage Progress */}
      <Card>
        <CardContent className="pt-6">
          <StageProgressBar currentStage={currentStage} />
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
            {currentStage === 'won' && (
              <Button
                size="sm"
                onClick={handleConvertToOpportunity}
                disabled={createOpportunity.isPending}
              >
                <Zap className="h-4 w-4 mr-1" />
                Convert to Opportunity
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Source</dt>
              <dd className="text-sm">{lead.source || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm">{lead.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
              <dd className="text-sm">{lead.phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Estimated Value</dt>
              <dd className="text-sm">{formatCurrency(lead.estimated_value)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Probability</dt>
              <dd className="text-sm">{lead.probability_pct != null ? `${lead.probability_pct}%` : '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">
                {new Date(lead.created_at).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </dd>
            </div>
            {lead.lost_reason && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-destructive">Lost Reason</dt>
                <dd className="text-sm">{lead.lost_reason}</dd>
              </div>
            )}
          </dl>
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

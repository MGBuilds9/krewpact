'use client';

import { ArrowLeft, FileText, MessageSquarePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AiInsightBanner } from '@/components/AI/AiInsightBanner';
import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { LinkedEstimateCard } from '@/components/CRM/LinkedEstimateCard';
import { LostDealDialog } from '@/components/CRM/LostDealDialog';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { OpportunityStageProgressBar } from '@/components/CRM/OpportunityStageProgressBar';
import { WonDealDialog } from '@/components/CRM/WonDealDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useActivities,
  useCreateLinkedEstimate,
  useDeleteOpportunity,
  useOpportunity,
  useOpportunityEstimates,
  useOpportunityStageTransition,
  useProposalData,
} from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/opportunity-stages';

import { OppInfoCard } from './_components/OppInfoCard';
import { OppSidePanel } from './_components/OppSidePanel';
import { OppStageActions } from './_components/OppStageActions';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface StageHistoryEntry {
  id: string;
  from_stage: string;
  to_stage: string;
  created_at: string;
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const opportunityId = params.id as string;
  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: activitiesResponse } = useActivities({ opportunityId });
  const activities = activitiesResponse ? activitiesResponse.data || [] : [];
  const { data: estimates } = useOpportunityEstimates(opportunityId);
  const createLinkedEstimate = useCreateLinkedEstimate();
  const proposalQuery = useProposalData(opportunityId);
  const stageTransition = useOpportunityStageTransition();
  const deleteOpportunity = useDeleteOpportunity();
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (!opportunity)
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Opportunity not found</h2>
        <p className="text-muted-foreground mb-4">
          This opportunity may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/crm/opportunities')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Opportunities
        </Button>
      </div>
    );

  const currentStage = opportunity.stage as OpportunityStage;
  const nextStages = ALLOWED_TRANSITIONS[currentStage] || [];
  const nextRegularStage = nextStages.find((s) => s !== 'closed_lost');
  const canMarkLost = nextStages.includes('closed_lost');
  const canMarkWon = currentStage === 'contracted';
  const nextStageLabel = nextRegularStage
    ? nextRegularStage
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';
  const stageHistory = (opportunity.opportunity_stage_history || []) as StageHistoryEntry[];
  const estimateCount = estimates ? estimates.length : 0;
  const probPct = opportunity.probability_pct || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/opportunities')}
          className="mt-1"
          aria-label="Back to opportunities"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {opportunity.opportunity_name}
          </h1>
          <p className="text-muted-foreground">
            {formatCurrency(opportunity.estimated_revenue)} | {probPct}% probability
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setActivityDialogOpen(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Log Activity
          </Button>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <AiInsightBanner entityType="opportunity" entityId={opportunityId} />

      <Card>
        <CardContent className="pt-6">
          <OpportunityStageProgressBar currentStage={currentStage} />
          <OppStageActions
            nextRegularStage={nextRegularStage}
            nextStageLabel={nextStageLabel}
            canMarkWon={canMarkWon}
            canMarkLost={canMarkLost}
            isPending={stageTransition.isPending}
            onNext={(stage) => stageTransition.mutate({ id: opportunityId, stage })}
            onWon={() => setWonDialogOpen(true)}
            onLost={() => setLostDialogOpen(true)}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <OppInfoCard
            opp={opportunity}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            currentStage={currentStage}
          />
          <LinkedEstimateCard
            opportunityId={opportunityId}
            estimates={estimates || []}
            onCreateEstimate={() => {
              const number = `EST-${Date.now().toString(36).toUpperCase()}`;
              createLinkedEstimate.mutate({
                opportunityId,
                estimate_number: number,
                total_amount: 0,
                status: 'draft',
              });
            }}
          />
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Proposal</h3>
                <p className="text-sm text-muted-foreground">
                  Generate proposal data from this opportunity and linked estimates.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => proposalQuery.refetch()}
                disabled={proposalQuery.isFetching}
              >
                <FileText className="h-4 w-4 mr-1" />
                {proposalQuery.isFetching ? 'Generating...' : 'Generate Proposal'}
              </Button>
            </CardContent>
          </Card>
          <NotesPanel entityType="opportunity" entityId={opportunityId} />
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Activity Timeline</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setActivityDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Log Activity
              </Button>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>
        <OppSidePanel
          opp={opportunity}
          currentStage={currentStage}
          activityCount={activities.length}
          estimateCount={estimateCount}
          stageHistory={stageHistory}
        />
      </div>

      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        entityType="opportunity"
        entityId={opportunityId}
      />
      <WonDealDialog
        opportunity={opportunity}
        open={wonDialogOpen}
        onOpenChange={setWonDialogOpen}
      />
      <LostDealDialog
        opportunity={opportunity}
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
      />
      <ConfirmReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Opportunity"
        description={`Permanently delete "${opportunity.opportunity_name}"? This will remove the opportunity and cannot be undone.`}
        reasonLabel="Reason"
        reasonRequired={false}
        confirmLabel="Delete Opportunity"
        destructive={true}
        onConfirm={() => {
          deleteOpportunity.mutate(opportunityId, {
            onSuccess: () => orgPush('/crm/opportunities'),
          });
        }}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ArrowRight,
  XCircle,
  Pencil,
  FileText,
  Plus,
  MessageSquarePlus,
  Trophy,
} from 'lucide-react';
import {
  useOpportunity,
  useActivities,
  useOpportunityStageTransition,
  useOpportunityEstimates,
  useCreateLinkedEstimate,
  useProposalData,
} from '@/hooks/useCRM';
import { LinkedEstimateCard } from '@/components/CRM/LinkedEstimateCard';
import { OpportunityStageProgressBar } from '@/components/CRM/OpportunityStageProgressBar';
import { OpportunityForm } from '@/components/CRM/OpportunityForm';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { WonDealDialog } from '@/components/CRM/WonDealDialog';
import { LostDealDialog } from '@/components/CRM/LostDealDialog';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/opportunity-stages';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const opportunityId = params.id as string;
  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: activitiesResponse } = useActivities({ opportunityId });
  const activities = activitiesResponse?.data ?? [];
  const { data: estimates } = useOpportunityEstimates(opportunityId);
  const createLinkedEstimate = useCreateLinkedEstimate();
  const proposalQuery = useProposalData(opportunityId);
  const stageTransition = useOpportunityStageTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);

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
        <Button onClick={() => orgPush('/crm/opportunities')}>
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
  const canMarkWon = currentStage === 'contracted';

  function handleNextStage() {
    if (!nextRegularStage) return;
    stageTransition.mutate({ id: opportunityId, stage: nextRegularStage });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/opportunities')}
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {opportunity.opportunity_name}
          </h1>
          <p className="text-muted-foreground">
            {formatCurrency(opportunity.estimated_revenue)} | {opportunity.probability_pct ?? 0}%
            probability
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
        </div>
      </div>

      {/* Stage Progress */}
      <Card>
        <CardContent className="pt-6">
          <OpportunityStageProgressBar currentStage={currentStage} />
          <div className="flex gap-2 mt-4 justify-end">
            {nextRegularStage && (
              <Button size="sm" onClick={handleNextStage} disabled={stageTransition.isPending}>
                <ArrowRight className="h-4 w-4 mr-1" />
                {nextRegularStage
                  .split('_')
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </Button>
            )}
            {canMarkWon && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setWonDialogOpen(true)}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Mark Won
              </Button>
            )}
            {canMarkLost && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setLostDialogOpen(true)}
                disabled={stageTransition.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Mark Lost
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
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
                    <dd className="text-sm">
                      {opportunity.probability_pct != null
                        ? `${opportunity.probability_pct}%`
                        : '-'}
                    </dd>
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

          {/* Linked Estimates */}
          <LinkedEstimateCard
            opportunityId={opportunityId}
            estimates={estimates ?? []}
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

          {/* Generate Proposal */}
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

          {/* Notes Panel */}
          <NotesPanel entityType="opportunity" entityId={opportunityId} />

          {/* Activity Timeline */}
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deal Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">{formatCurrency(opportunity.estimated_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weighted Value</span>
                <span className="font-medium">
                  {formatCurrency(
                    (opportunity.estimated_revenue ?? 0) *
                      ((opportunity.probability_pct ?? 0) / 100),
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Probability</span>
                <span>{opportunity.probability_pct ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Close</span>
                <span>
                  {opportunity.target_close_date
                    ? new Date(opportunity.target_close_date).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage</span>
                <span className="capitalize">{currentStage.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activities</span>
                <span>{activities.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimates</span>
                <span>{estimates?.length ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stage History */}
          {opportunity.opportunity_stage_history &&
            opportunity.opportunity_stage_history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Stage History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {opportunity.opportunity_stage_history.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="capitalize text-muted-foreground">
                            {entry.from_stage.replace(/_/g, ' ')}
                          </span>
                          <span className="mx-1.5 text-muted-foreground">&rarr;</span>
                          <span className="capitalize font-medium">
                            {entry.to_stage.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Dialogs */}
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
    </div>
  );
}

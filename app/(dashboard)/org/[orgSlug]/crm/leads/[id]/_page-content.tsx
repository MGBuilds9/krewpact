'use client';

import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AiInsightBanner } from '@/components/AI/AiInsightBanner';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteLead } from '@/hooks/crm/useLeads';
import {
  type RuleResultDisplay,
  useActivities,
  useContacts,
  useLead,
  useLeadAccountMatches,
  useLeadScoreBreakdown,
  useLeadStageHistory,
  useLeadStageTransition,
  useRecalculateLeadScore,
} from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { LeadStage } from '@/lib/crm/lead-stages';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/lead-stages';
import { formatStatus } from '@/lib/format-status';

import { LeadActivityCard } from './_components/LeadActivityCard';
import { LeadContactsCard } from './_components/LeadContactsCard';
import { LeadDialogs } from './_components/LeadDialogs';
import { LeadHeader } from './_components/LeadHeader';
import { LeadInfoCard } from './_components/LeadInfoCard';
import { LeadSidePanel } from './_components/LeadSidePanel';
import { LeadStageCard } from './_components/LeadStageCard';

type ContactItem = NonNullable<ReturnType<typeof useContacts>['data']>['data'][number];

function getLeadLocation(
  city: string | null | undefined,
  province: string | null | undefined,
): string {
  if (!city) return '';
  return province ? `${city}, ${province}` : city;
}

function getPrimaryContact(contacts: ContactItem[]): ContactItem | undefined {
  return contacts.find((c) => c.is_primary) || contacts[0];
}

// eslint-disable-next-line max-lines-per-function, complexity
export default function LeadDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const leadId = params.id as string;
  const { data: lead, isLoading, refetch: refetchLead } = useLead(leadId);
  const { data: activitiesResponse } = useActivities({ leadId });
  const { data: contactsResponse } = useContacts({ leadId });
  const activities = activitiesResponse ? activitiesResponse.data || [] : [];
  const leadContacts = contactsResponse ? contactsResponse.data || [] : [];
  const { data: stageHistory } = useLeadStageHistory(leadId);
  const stageTransition = useLeadStageTransition();
  const recalculateScore = useRecalculateLeadScore();
  const deleteLead = useDeleteLead();
  const { data: scoreBreakdown } = useLeadScoreBreakdown(leadId);
  const { data: accountMatches } = useLeadAccountMatches(leadId);
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [markLostDialogOpen, setMarkLostDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (!lead)
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Lead not found</h2>
        <p className="text-muted-foreground mb-4">
          This lead may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/crm/leads')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );

  const currentStage = (lead.status as LeadStage) || 'new';
  const nextStages = ALLOWED_TRANSITIONS[currentStage] || [];
  const nextRegularStage = nextStages.find((s) => s !== 'lost');
  const canMarkLost = nextStages.includes('lost');
  const primaryContact = getPrimaryContact(leadContacts);
  const ruleResults = scoreBreakdown
    ? (scoreBreakdown.rule_results as RuleResultDisplay[] | undefined)
    : undefined;
  const recipientEmail = primaryContact && primaryContact.email ? primaryContact.email : undefined;
  const recipientName = primaryContact
    ? `${primaryContact.first_name} ${primaryContact.last_name}`
    : undefined;
  const leadLocation = getLeadLocation(lead.city, lead.province);
  const leadTags = lead.tags || [];
  const customerMatch = accountMatches?.find((m) => m.match_score >= 0.8);

  function handleNextStage() {
    if (!nextRegularStage) return;
    stageTransition.mutate({ id: leadId, status: nextRegularStage });
  }

  return (
    <div className="space-y-6">
      <LeadHeader
        lead={lead}
        leadLocation={leadLocation}
        isEditing={isEditing}
        onEmail={() => setEmailDialogOpen(true)}
        onActivity={() => setActivityDialogOpen(true)}
        onEdit={() => setIsEditing(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        orgPush={orgPush}
      />
      <AiInsightBanner entityType="lead" entityId={leadId} />
      {customerMatch && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Existing Customer Match</AlertTitle>
          <AlertDescription>
            This lead matches <strong>{customerMatch.account?.account_name}</strong> (
            {formatStatus(customerMatch.match_type)}, {Math.round(customerMatch.match_score * 100)}%
            confidence). Outreach sequences are suppressed for existing customers.
          </AlertDescription>
        </Alert>
      )}
      <LeadStageCard
        currentStage={currentStage}
        nextRegularStage={nextRegularStage}
        canMarkLost={canMarkLost}
        isPending={stageTransition.isPending}
        stageHistory={stageHistory}
        onNext={handleNextStage}
        onLost={() => setMarkLostDialogOpen(true)}
        onConvert={() => setConvertDialogOpen(true)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} isEditing={isEditing} setIsEditing={setIsEditing} />
          <LeadContactsCard contacts={leadContacts} leadId={leadId} orgPush={orgPush} />
          <NotesPanel entityType="lead" entityId={leadId} />
          <LeadActivityCard
            activities={activities}
            onLogActivity={() => setActivityDialogOpen(true)}
          />
        </div>
        <LeadSidePanel
          lead={lead}
          leadTags={leadTags}
          contactCount={leadContacts.length}
          activityCount={activities.length}
          ruleResults={ruleResults}
          onRecalculate={() => recalculateScore.mutate(leadId)}
          isRecalculating={recalculateScore.isPending}
          onResearchComplete={() => refetchLead()}
        />
      </div>
      <LeadDialogs
        lead={lead}
        leadId={leadId}
        activityDialogOpen={activityDialogOpen}
        setActivityDialogOpen={setActivityDialogOpen}
        convertDialogOpen={convertDialogOpen}
        setConvertDialogOpen={setConvertDialogOpen}
        emailDialogOpen={emailDialogOpen}
        setEmailDialogOpen={setEmailDialogOpen}
        markLostDialogOpen={markLostDialogOpen}
        setMarkLostDialogOpen={setMarkLostDialogOpen}
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        recipientEmail={recipientEmail}
        recipientName={recipientName}
        onConfirmMarkLost={(reason) =>
          stageTransition.mutate({ id: leadId, status: 'lost', lost_reason: reason })
        }
        onConfirmDelete={() =>
          deleteLead.mutate(leadId, { onSuccess: () => orgPush('/crm/leads') })
        }
      />
    </div>
  );
}

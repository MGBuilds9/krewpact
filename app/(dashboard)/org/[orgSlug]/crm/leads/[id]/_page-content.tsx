'use client';

import {
  ArrowLeft,
  ArrowRight,
  Mail,
  MessageSquarePlus,
  Pencil,
  Phone,
  Plus,
  Send,
  User,
  XCircle,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AiInsightBanner } from '@/components/AI';
import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { ConvertLeadDialog } from '@/components/CRM/ConvertLeadDialog';
import { EmailComposeDialog } from '@/components/CRM/EmailComposeDialog';
import { LeadScoreCard } from '@/components/CRM/LeadScoreCard';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { StageProgressBar } from '@/components/CRM/StageProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type RuleResultDisplay,
  useActivities,
  useContacts,
  useLead,
  useLeadScoreBreakdown,
  useLeadStageTransition,
  useRecalculateLeadScore,
} from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { LeadStage } from '@/lib/crm/lead-stages';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/lead-stages';
import { cn } from '@/lib/utils';

const LeadForm = dynamic(() => import('@/components/CRM/LeadForm').then((m) => m.LeadForm), {
  loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
});
const EnrichmentIntelCard = dynamic(
  () => import('@/components/CRM/EnrichmentIntelCard').then((m) => m.EnrichmentIntelCard),
  { loading: () => <Skeleton className="h-32 w-full rounded-xl" /> },
);

type LeadData = NonNullable<ReturnType<typeof useLead>['data']>;
type ContactItem = NonNullable<ReturnType<typeof useContacts>['data']>['data'][number];
type ActivityItem = NonNullable<ReturnType<typeof useActivities>['data']>['data'][number];

const STATUS_TO_STAGE: Record<string, LeadStage> = {
  new: 'new',
  contacted: 'new',
  qualified: 'qualified',
  proposal: 'qualified',
  negotiation: 'qualified',
  nurture: 'qualified',
  won: 'won',
  lost: 'lost',
};

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

interface InfoCardProps {
  lead: LeadData;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
}
function LeadInfoCard({ lead, isEditing, setIsEditing }: InfoCardProps) {
  const location = lead.city ? `${lead.city}${lead.province ? `, ${lead.province}` : ''}` : '-';
  const lastActivity = lead.last_touch_at
    ? new Date(lead.last_touch_at).toLocaleDateString('en-CA', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '-';
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Lead' : 'Lead Information'}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <LeadForm
            lead={lead}
            onSuccess={() => setIsEditing(false)}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Status</dt>
              <dd className="text-sm capitalize">{lead.status.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Industry</dt>
              <dd className="text-sm">{lead.industry || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Source</dt>
              <dd className="text-sm capitalize">
                {lead.source_channel?.replace(/_/g, ' ') || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Location</dt>
              <dd className="text-sm">{location}</dd>
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
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Activity</dt>
              <dd className="text-sm">{lastActivity}</dd>
            </div>
            {lead.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{lead.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

interface ContactsCardProps {
  contacts: ContactItem[];
  leadId: string;
  orgPush: (path: string) => void;
}
function LeadContactsCard({ contacts, leadId, orgPush }: ContactsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => orgPush(`/crm/contacts/new?lead_id=${leadId}`)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No contacts linked to this lead</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => orgPush(`/crm/contacts/${contact.id}`)}
              >
                <div>
                  <div className="font-medium text-sm">
                    {contact.first_name} {contact.last_name}
                    {contact.is_primary && (
                      <span className="ml-2 text-xs text-primary">(Primary)</span>
                    )}
                  </div>
                  {contact.role_title && (
                    <div className="text-xs text-muted-foreground">{contact.role_title}</div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {contact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StageCardProps {
  currentStage: LeadStage;
  nextRegularStage: string | undefined;
  canMarkLost: boolean;
  isPending: boolean;
  onNext: () => void;
  onLost: () => void;
  onConvert: () => void;
}
function LeadStageCard({
  currentStage,
  nextRegularStage,
  canMarkLost,
  isPending,
  onNext,
  onLost,
  onConvert,
}: StageCardProps) {
  const nextLabel = nextRegularStage
    ? nextRegularStage
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';
  return (
    <Card>
      <CardContent className="pt-6">
        <StageProgressBar currentStage={currentStage} />
        <div className="flex gap-2 mt-4 justify-end">
          {nextRegularStage && (
            <Button size="sm" onClick={onNext} disabled={isPending}>
              <ArrowRight className="h-4 w-4 mr-1" />
              {nextLabel}
            </Button>
          )}
          {canMarkLost && (
            <Button size="sm" variant="destructive" onClick={onLost} disabled={isPending}>
              <XCircle className="h-4 w-4 mr-1" />
              Mark Lost
            </Button>
          )}
          {currentStage === 'won' && (
            <Button size="sm" onClick={onConvert}>
              <Zap className="h-4 w-4 mr-1" />
              Convert to Opportunity
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickInfoProps {
  lead: LeadData;
  contactCount: number;
  activityCount: number;
}
function LeadQuickInfo({ lead, contactCount, activityCount }: QuickInfoProps) {
  const isOverdue = lead.next_followup_at && new Date(lead.next_followup_at) < new Date();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {lead.source_channel && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source</span>
            <span className="capitalize">{lead.source_channel.replace(/_/g, ' ')}</span>
          </div>
        )}
        {lead.next_followup_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next Follow-up</span>
            <span className={cn(isOverdue ? 'text-red-600 font-medium' : '')}>
              {new Date(lead.next_followup_at).toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contacts</span>
          <span>{contactCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Activities</span>
          <span>{activityCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityCardProps {
  activities: ActivityItem[];
  onLogActivity: () => void;
}
function LeadActivityCard({ activities, onLogActivity }: ActivityCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activity Timeline</CardTitle>
        <Button size="sm" variant="outline" onClick={onLogActivity}>
          <Plus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
      </CardHeader>
      <CardContent>
        <ActivityTimeline activities={activities} />
      </CardContent>
    </Card>
  );
}

interface LeadHeaderProps {
  lead: LeadData;
  leadLocation: string;
  isEditing: boolean;
  onEmail: () => void;
  onActivity: () => void;
  onEdit: () => void;
  orgPush: (path: string) => void;
}
function LeadHeader({
  lead,
  leadLocation,
  isEditing,
  onEmail,
  onActivity,
  onEdit,
  orgPush,
}: LeadHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => orgPush('/crm/leads')}
        className="mt-1"
        aria-label="Back to leads"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{lead.company_name}</h1>
        <div className="flex items-center gap-2 mt-1">
          {lead.industry && <span className="text-muted-foreground text-sm">{lead.industry}</span>}
          {leadLocation && <span className="text-muted-foreground text-sm">{leadLocation}</span>}
          {lead.is_qualified && (
            <Badge className="text-xs bg-green-500 text-white">Qualified</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onEmail}>
          <Send className="h-4 w-4 mr-1" />
          Email
        </Button>
        <Button variant="outline" size="sm" onClick={onActivity}>
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

interface LeadSidePanelProps {
  lead: LeadData;
  leadTags: string[];
  contactCount: number;
  activityCount: number;
  ruleResults: RuleResultDisplay[] | undefined;
  onRecalculate: () => void;
  isRecalculating: boolean;
}
function LeadSidePanel({
  lead,
  leadTags,
  contactCount,
  activityCount,
  ruleResults,
  onRecalculate,
  isRecalculating,
}: LeadSidePanelProps) {
  const score = lead.lead_score || 0;
  const fitScore = lead.fit_score || 0;
  const intentScore = lead.intent_score || 0;
  const engagementScore = lead.engagement_score || 0;
  return (
    <div className="space-y-6">
      <LeadScoreCard
        score={score}
        fitScore={fitScore}
        intentScore={intentScore}
        engagementScore={engagementScore}
        onRecalculate={onRecalculate}
        isRecalculating={isRecalculating}
        ruleResults={ruleResults}
      />
      <LeadQuickInfo lead={lead} contactCount={contactCount} activityCount={activityCount} />
      {leadTags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {leadTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const leadId = params.id as string;
  const { data: lead, isLoading, refetch: refetchLead } = useLead(leadId);
  const { data: activitiesResponse } = useActivities({ leadId });
  const { data: contactsResponse } = useContacts({ leadId });
  const activities = activitiesResponse ? activitiesResponse.data || [] : [];
  const leadContacts = contactsResponse ? contactsResponse.data || [] : [];
  const stageTransition = useLeadStageTransition();
  const recalculateScore = useRecalculateLeadScore();
  const { data: scoreBreakdown } = useLeadScoreBreakdown(leadId);
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [markLostDialogOpen, setMarkLostDialogOpen] = useState(false);

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

  const currentStage = STATUS_TO_STAGE[lead.status] || ('new' as LeadStage);
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

  function handleNextStage() {
    if (!nextRegularStage) return;
    stageTransition.mutate({ id: leadId, status: nextRegularStage });
  }
  function handleMarkLost() {
    setMarkLostDialogOpen(true);
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
        orgPush={orgPush}
      />
      <AiInsightBanner entityType="lead" entityId={leadId} />
      <LeadStageCard
        currentStage={currentStage}
        nextRegularStage={nextRegularStage}
        canMarkLost={canMarkLost}
        isPending={stageTransition.isPending}
        onNext={handleNextStage}
        onLost={handleMarkLost}
        onConvert={() => setConvertDialogOpen(true)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LeadInfoCard lead={lead} isEditing={isEditing} setIsEditing={setIsEditing} />
          <LeadContactsCard contacts={leadContacts} leadId={leadId} orgPush={orgPush} />
          <NotesPanel entityType="lead" entityId={leadId} />
          <EnrichmentIntelCard
            enrichmentData={lead.enrichment_data as Record<string, unknown> | null}
            enrichmentStatus={lead.enrichment_status as string | null}
            leadId={leadId}
            onResearchComplete={() => refetchLead()}
          />
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
        />
      </div>
      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        entityType="lead"
        entityId={leadId}
      />
      <ConvertLeadDialog lead={lead} open={convertDialogOpen} onOpenChange={setConvertDialogOpen} />
      <EmailComposeDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipientEmail={recipientEmail}
        recipientName={recipientName}
        leadId={leadId}
      />
      <ConfirmReasonDialog
        open={markLostDialogOpen}
        onOpenChange={setMarkLostDialogOpen}
        title="Mark Lead as Lost"
        description="Provide a reason for closing this lead as lost."
        reasonLabel="Reason"
        reasonRequired={true}
        confirmLabel="Mark Lost"
        destructive={true}
        onConfirm={(reason) => {
          if (reason) stageTransition.mutate({ id: leadId, status: 'lost', lost_reason: reason });
        }}
      />
    </div>
  );
}

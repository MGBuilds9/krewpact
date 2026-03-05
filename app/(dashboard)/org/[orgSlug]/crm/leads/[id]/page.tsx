'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ArrowRight,
  XCircle,
  Zap,
  Pencil,
  Mail,
  Phone,
  Plus,
  User,
  MessageSquarePlus,
  Send,
} from 'lucide-react';
import {
  useLead,
  useActivities,
  useContacts,
  useLeadStageTransition,
  useRecalculateLeadScore,
} from '@/hooks/useCRM';
import { StageProgressBar } from '@/components/CRM/StageProgressBar';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { LeadForm } from '@/components/CRM/LeadForm';
import { EnrichmentIntelCard } from '@/components/CRM/EnrichmentIntelCard';
import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { LeadScoreCard } from '@/components/CRM/LeadScoreCard';
import { ConvertLeadDialog } from '@/components/CRM/ConvertLeadDialog';
import { EmailComposeDialog } from '@/components/CRM/EmailComposeDialog';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/lead-stages';
import type { LeadStage } from '@/lib/crm/lead-stages';
import { cn } from '@/lib/utils';

export default function LeadDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const leadId = params.id as string;
  const { data: lead, isLoading, refetch: refetchLead } = useLead(leadId);
  const { data: activitiesResponse } = useActivities({ leadId });
  const { data: contactsResponse } = useContacts({ leadId });
  const activities = activitiesResponse?.data ?? [];
  const leadContacts = contactsResponse?.data ?? [];
  const stageTransition = useLeadStageTransition();
  const recalculateScore = useRecalculateLeadScore();
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

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
        <Button onClick={() => orgPush('/crm/leads')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Leads
        </Button>
      </div>
    );
  }

  const statusToStage: Record<string, LeadStage> = {
    new: 'new',
    contacted: 'new',
    qualified: 'qualified',
    unqualified: 'new',
    nurturing: 'qualified',
    won: 'won',
    lost: 'lost',
    disqualified: 'lost',
  };
  const currentStage = statusToStage[lead.status] || ('new' as LeadStage);
  const nextStages = ALLOWED_TRANSITIONS[currentStage] || [];
  const nextRegularStage = nextStages.find((s) => s !== 'lost');
  const canMarkLost = nextStages.includes('lost');

  const primaryContact = leadContacts.find((c) => c.is_primary) || leadContacts[0];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/leads')} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{lead.company_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {lead.industry && (
              <span className="text-muted-foreground text-sm">{lead.industry}</span>
            )}
            {lead.city && (
              <span className="text-muted-foreground text-sm">
                {lead.city}
                {lead.province ? `, ${lead.province}` : ''}
              </span>
            )}
            {lead.is_qualified && (
              <Badge className="text-xs bg-green-500 text-white">Qualified</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)}>
            <Send className="h-4 w-4 mr-1" />
            Email
          </Button>
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
          <StageProgressBar currentStage={currentStage} />
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
              <Button size="sm" onClick={() => setConvertDialogOpen(true)}>
                <Zap className="h-4 w-4 mr-1" />
                Convert to Opportunity
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
                    <dd className="text-sm">
                      {lead.city ? `${lead.city}${lead.province ? `, ${lead.province}` : ''}` : '-'}
                    </dd>
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
                    <dd className="text-sm">
                      {lead.last_activity_at
                        ? new Date(lead.last_activity_at).toLocaleDateString('en-CA', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </dd>
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

          {/* Contacts */}
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
              {leadContacts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No contacts linked to this lead</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leadContacts.map((contact) => (
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

          {/* Notes Panel */}
          <NotesPanel entityType="lead" entityId={leadId} />

          {/* Enrichment Intel */}
          <EnrichmentIntelCard
            enrichmentData={lead.enrichment_data as Record<string, unknown> | null}
            enrichmentStatus={lead.enrichment_status as string | null}
            leadId={leadId}
            onResearchComplete={() => refetchLead()}
          />

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
          <LeadScoreCard
            score={lead.lead_score ?? 0}
            fitScore={lead.fit_score ?? 0}
            intentScore={lead.intent_score ?? 0}
            engagementScore={lead.engagement_score ?? 0}
            onRecalculate={() => recalculateScore.mutate(leadId)}
            isRecalculating={recalculateScore.isPending}
          />

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
              {lead.company_size && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company Size</span>
                  <span>{lead.company_size}</span>
                </div>
              )}
              {lead.revenue_range && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue Range</span>
                  <span>{lead.revenue_range}</span>
                </div>
              )}
              {lead.next_followup_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Follow-up</span>
                  <span
                    className={cn(
                      new Date(lead.next_followup_at) < new Date()
                        ? 'text-red-600 font-medium'
                        : '',
                    )}
                  >
                    {new Date(lead.next_followup_at).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contacts</span>
                <span>{leadContacts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activities</span>
                <span>{activities.length}</span>
              </div>
            </CardContent>
          </Card>

          {lead.tags && lead.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
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
        entityType="lead"
        entityId={leadId}
      />
      <ConvertLeadDialog lead={lead} open={convertDialogOpen} onOpenChange={setConvertDialogOpen} />
      <EmailComposeDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipientEmail={primaryContact?.email ?? undefined}
        recipientName={
          primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : undefined
        }
        leadId={leadId}
      />
    </div>
  );
}

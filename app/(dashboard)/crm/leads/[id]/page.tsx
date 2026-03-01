'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowRight, XCircle, Zap, Pencil, Mail, Phone, Plus, User } from 'lucide-react';
import { useLead, useActivities, useContacts, useLeadStageTransition, useCreateOpportunity } from '@/hooks/useCRM';
import { StageProgressBar } from '@/components/CRM/StageProgressBar';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { LeadForm } from '@/components/CRM/LeadForm';
import { EnrichmentIntelCard } from '@/components/CRM/EnrichmentIntelCard';
import { ALLOWED_TRANSITIONS } from '@/lib/crm/lead-stages';
import type { LeadStage } from '@/lib/crm/lead-stages';
import { cn } from '@/lib/utils';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { data: lead, isLoading, refetch: refetchLead } = useLead(leadId);
  const { data: activitiesResponse } = useActivities({ leadId });
  const { data: contactsResponse } = useContacts({ leadId });
  const activities = activitiesResponse?.data ?? [];
  const leadContacts = contactsResponse?.data ?? [];
  const stageTransition = useLeadStageTransition();
  const createOpportunity = useCreateOpportunity();
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

  // Map status to stage for the progress bar (best effort)
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
        opportunity_name: lead.company_name,
        lead_id: lead.id,
        division_id: lead.division_id,
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
          <h1 className="text-2xl font-bold tracking-tight truncate">{lead.company_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {lead.industry && (
              <span className="text-muted-foreground text-sm">{lead.industry}</span>
            )}
            {lead.city && (
              <span className="text-muted-foreground text-sm">
                {lead.city}{lead.province ? `, ${lead.province}` : ''}
              </span>
            )}
            {lead.lead_score != null && lead.lead_score > 0 && (
              <Badge variant="outline" className={cn(
                'text-xs',
                lead.lead_score >= 80 ? 'border-green-500 text-green-600' :
                lead.lead_score >= 50 ? 'border-yellow-500 text-yellow-600' :
                'border-red-500 text-red-600'
              )}>
                Score: {lead.lead_score}
              </Badge>
            )}
            {lead.is_qualified && (
              <Badge className="text-xs bg-green-500 text-white">Qualified</Badge>
            )}
          </div>
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
                <dd className="text-sm capitalize">{lead.source_channel?.replace(/_/g, ' ') || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                <dd className="text-sm">
                  {lead.city ? `${lead.city}${lead.province ? `, ${lead.province}` : ''}` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Lead Score</dt>
                <dd className="text-sm">
                  {lead.lead_score != null && lead.lead_score > 0 ? (
                    <span className={cn(
                      'font-medium',
                      lead.lead_score >= 80 ? 'text-green-600' :
                      lead.lead_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {lead.lead_score}
                    </span>
                  ) : '-'}
                  {lead.fit_score != null && lead.fit_score > 0 && (
                    <span className="text-muted-foreground text-xs ml-2">
                      (Fit: {lead.fit_score} / Intent: {lead.intent_score} / Engage: {lead.engagement_score})
                    </span>
                  )}
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
            onClick={() => router.push(`/crm/contacts/new?lead_id=${leadId}`)}
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
                  onClick={() => router.push(`/crm/contacts/${contact.id}`)}
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

      {/* Enrichment Intel */}
      <EnrichmentIntelCard
        enrichmentData={lead.enrichment_data as Record<string, unknown> | null}
        enrichmentStatus={lead.enrichment_status as string | null}
        leadId={leadId}
        onResearchComplete={() => refetchLead()}
      />

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}

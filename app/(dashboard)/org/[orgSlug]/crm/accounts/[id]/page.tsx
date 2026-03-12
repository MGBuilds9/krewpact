'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Pencil,
  Plus,
  MessageSquarePlus,
  CalendarPlus,
  Globe,
  Tag,
  FolderKanban,
} from 'lucide-react';
import { useAccount, useContacts, useOpportunities, useAccountProjects } from '@/hooks/useCRM';
import { AccountForm } from '@/components/CRM/AccountForm';
import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { AccountHealthCard } from '@/components/CRM/AccountHealthCard';
import { UnifiedTimeline } from '@/components/CRM/UnifiedTimeline';
import { QuickFollowUpDialog } from '@/components/CRM/QuickFollowUpDialog';
import { ProjectHistoryCard } from '@/components/CRM/ProjectHistoryCard';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AccountDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const accountId = params.id as string;
  const { data: account, isLoading } = useAccount(accountId);
  const { data: contactsResponse } = useContacts({ accountId });
  const { data: opportunities } = useOpportunities({ accountId });
  const { data: projectsResponse } = useAccountProjects(accountId);
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  const accountContacts = contactsResponse?.data ?? [];
  const accountOpportunities = opportunities?.data ?? [];
  const projectHistory = projectsResponse?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Account not found</h2>
        <p className="text-muted-foreground mb-4">
          This account may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/crm/accounts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accounts
        </Button>
      </div>
    );
  }

  // Calculate total pipeline value for this account
  const totalPipelineValue = accountOpportunities.reduce(
    (sum, opp) => sum + (opp.estimated_revenue ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/accounts')}
          className="mt-1"
          aria-label="Back to accounts"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{account.account_name}</h1>
            {account.is_repeat_client && (
              <Badge className="bg-green-100 text-green-800 border-green-200 flex-shrink-0">
                Repeat Client
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {account.account_type && <span className="capitalize">{account.account_type}</span>}
            {totalPipelineValue > 0 && (
              <span className="text-green-600 font-medium">
                {formatCurrency(totalPipelineValue)} pipeline
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}>
            <CalendarPlus className="h-4 w-4 mr-1" />
            Follow-Up
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

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="projects">
            Projects ({account.total_projects ?? projectHistory.length})
          </TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({accountContacts.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities ({accountOpportunities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Account' : 'Account Information'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <AccountForm
                  account={account}
                  onSuccess={() => setIsEditing(false)}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Account Type</dt>
                    <dd className="text-sm capitalize">{account.account_type || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Industry</dt>
                    <dd className="text-sm">{account.industry || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                    <dd className="text-sm">
                      {account.phone ? (
                        <a
                          href={`tel:${account.phone}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {account.phone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                    <dd className="text-sm">
                      {account.email ? (
                        <a
                          href={`mailto:${account.email}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {account.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Website</dt>
                    <dd className="text-sm">
                      {account.website ? (
                        <a
                          href={account.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-center gap-1 text-primary"
                        >
                          <Globe className="h-3 w-3" />
                          {account.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Source</dt>
                    <dd className="text-sm capitalize">{account.source || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Total Projects</dt>
                    <dd className="text-sm">{account.total_projects ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Lifetime Revenue</dt>
                    <dd className="text-sm font-medium">
                      {formatCurrency(account.lifetime_revenue)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">First Project</dt>
                    <dd className="text-sm">{formatDate(account.first_project_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Last Project</dt>
                    <dd className="text-sm">{formatDate(account.last_project_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Repeat Client</dt>
                    <dd className="text-sm">
                      {account.is_repeat_client ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="text-sm">{formatDate(account.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Contacts</dt>
                    <dd className="text-sm">{accountContacts.length}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Opportunities</dt>
                    <dd className="text-sm">{accountOpportunities.length}</dd>
                  </div>
                  {account.tags && account.tags.length > 0 && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Tags
                      </dt>
                      <dd className="flex flex-wrap gap-1">
                        {account.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </dd>
                    </div>
                  )}
                  {account.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                      <dd className="text-sm whitespace-pre-wrap">{account.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <AccountHealthCard accountId={accountId} />
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Project History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No project history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectHistory.map((project) => (
                    <ProjectHistoryCard key={project.id} project={project} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => orgPush(`/crm/contacts/new?account_id=${accountId}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent>
              {accountContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No contacts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountContacts.map((contact) => (
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
        </TabsContent>

        <TabsContent value="notes">
          <NotesPanel entityType="account" entityId={accountId} />
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Timeline</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setActivityDialogOpen(true)}>
                <MessageSquarePlus className="h-4 w-4 mr-1" />
                Log Activity
              </Button>
            </CardHeader>
            <CardContent>
              <UnifiedTimeline accountId={accountId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardContent className="pt-6">
              {accountOpportunities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No opportunities linked to this account</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => orgPush(`/crm/opportunities/${opp.id}`)}
                    >
                      <div>
                        <div className="font-medium text-sm">{opp.opportunity_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {opp.stage.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(opp.estimated_revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        entityType="account"
        entityId={accountId}
      />
      <QuickFollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        entityType="account"
        entityId={accountId}
        entityName={account.account_name}
      />
    </div>
  );
}

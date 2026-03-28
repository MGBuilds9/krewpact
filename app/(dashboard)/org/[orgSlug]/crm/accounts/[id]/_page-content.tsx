'use client';

import { ArrowLeft, CalendarPlus, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { AiInsightBanner } from '@/components/AI/AiInsightBanner';
import { AccountHealthCard } from '@/components/CRM/AccountHealthCard';
import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { QuickFollowUpDialog } from '@/components/CRM/QuickFollowUpDialog';
import { UnifiedTimeline } from '@/components/CRM/UnifiedTimeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAccount,
  useAccountProjects,
  useContacts,
  useDeleteAccount,
  useOpportunities,
} from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { ContactsTab } from './_components/ContactsTab';
import { OpportunitiesTab } from './_components/OpportunitiesTab';
import { OverviewTab } from './_components/OverviewTab';
import { ProjectsTab } from './_components/ProjectsTab';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

// eslint-disable-next-line max-lines-per-function
export default function AccountDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const accountId = params.id as string;
  const { data: account, isLoading } = useAccount(accountId);
  const { data: contactsResponse } = useContacts({ accountId });
  const { data: opportunities } = useOpportunities({ accountId });
  const { data: projectsResponse } = useAccountProjects(accountId);
  const deleteAccount = useDeleteAccount();
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const accountContacts = contactsResponse ? contactsResponse.data || [] : [];
  const accountOpportunities = opportunities ? opportunities.data || [] : [];
  const projectHistory = projectsResponse ? projectsResponse.data || [] : [];

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (!account)
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

  const totalPipelineValue = accountOpportunities.reduce(
    (sum, opp) => sum + (opp.estimated_revenue || 0),
    0,
  );
  const projectCount = account.total_projects || projectHistory.length;

  return (
    <div className="space-y-6">
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
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <AiInsightBanner entityType="account" entityId={accountId} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projectCount})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({accountContacts.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities ({accountOpportunities.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab
            account={account}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            contactCount={accountContacts.length}
            oppCount={accountOpportunities.length}
          />
        </TabsContent>
        <TabsContent value="health">
          <AccountHealthCard accountId={accountId} />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsTab projectHistory={projectHistory} />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab contacts={accountContacts} accountId={accountId} orgPush={orgPush} />
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
          <OpportunitiesTab opps={accountOpportunities} orgPush={orgPush} />
        </TabsContent>
      </Tabs>

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
      <ConfirmReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Account"
        description={`Permanently delete "${account.account_name}"? This will remove the account and cannot be undone.`}
        reasonLabel="Reason"
        reasonRequired={false}
        confirmLabel="Delete Account"
        destructive={true}
        onConfirm={() => {
          deleteAccount.mutate(accountId, {
            onSuccess: () => orgPush('/crm/accounts'),
          });
        }}
      />
    </div>
  );
}

'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { EmailComposeDialog } from '@/components/CRM/EmailComposeDialog';
import { NotesPanel } from '@/components/CRM/NotesPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccount, useActivities, useContact } from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import { ContactHeader } from './_components/ContactHeader';
import { AccountTab, ActivitiesTab, OverviewTab } from './_components/ContactTabs';

export default function ContactDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const contactId = params.id as string;
  const { data: contact, isLoading } = useContact(contactId);
  const { data: account } = useAccount(contact?.account_id ?? '');
  const { data: activitiesResponse } = useActivities({ contactId });
  const [isEditing, setIsEditing] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const activities = activitiesResponse?.data ?? [];

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (!contact)
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Contact not found</h2>
        <p className="text-muted-foreground mb-4">
          This contact may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/crm/contacts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <ContactHeader
        contact={contact}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onEmailClick={() => setEmailDialogOpen(true)}
        onLogActivity={() => setActivityDialogOpen(true)}
        onBack={() => orgPush('/crm/contacts')}
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab contact={contact} isEditing={isEditing} setIsEditing={setIsEditing} />
        </TabsContent>
        <TabsContent value="account">
          <AccountTab contact={contact} account={account} orgPush={orgPush} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel entityType="contact" entityId={contactId} />
        </TabsContent>
        <TabsContent value="activities">
          <ActivitiesTab
            activities={activities}
            onLogActivity={() => setActivityDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>
      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        entityType="contact"
        entityId={contactId}
      />
      <EmailComposeDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipientEmail={contact.email ?? undefined}
        recipientName={`${contact.first_name} ${contact.last_name}`}
        contactId={contactId}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, Pencil, Building2 } from 'lucide-react';
import { useContact, useAccount, useActivities } from '@/hooks/useCRM';
import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { ContactForm } from '@/components/CRM/ContactForm';

export default function ContactDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const contactId = params.id as string;
  const { data: contact, isLoading } = useContact(contactId);
  const { data: account } = useAccount(contact?.account_id ?? '');
  const { data: activitiesResponse } = useActivities({ contactId });
  const [isEditing, setIsEditing] = useState(false);

  const activities = activitiesResponse?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!contact) {
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
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/contacts')}
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {contact.first_name} {contact.last_name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {contact.role_title && (
              <span className="text-muted-foreground text-sm">{contact.role_title}</span>
            )}
            {contact.is_primary && (
              <Badge variant="outline" className="text-xs border-primary text-primary">
                Primary
              </Badge>
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

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Contact' : 'Contact Information'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <ContactForm
                  contact={contact}
                  onSuccess={() => setIsEditing(false)}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">First Name</dt>
                    <dd className="text-sm">{contact.first_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Last Name</dt>
                    <dd className="text-sm">{contact.last_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                    <dd className="text-sm">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                    <dd className="text-sm">
                      {contact.phone ? (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </a>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Role / Title</dt>
                    <dd className="text-sm">{contact.role_title || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Primary Contact</dt>
                    <dd className="text-sm">{contact.is_primary ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="text-sm">
                      {new Date(contact.created_at).toLocaleDateString('en-CA', {
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
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardContent className="pt-6">
              {contact.account_id && account ? (
                <div
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => orgPush(`/crm/accounts/${account.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{account.account_name}</div>
                      {account.account_type && (
                        <div className="text-xs text-muted-foreground capitalize">
                          {account.account_type}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No linked account</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardContent className="pt-6">
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

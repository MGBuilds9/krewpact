'use client';

import { Building2, Mail, MessageSquarePlus, Phone } from 'lucide-react';

import { ActivityTimeline } from '@/components/CRM/ActivityTimeline';
import { ContactForm } from '@/components/CRM/ContactForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccount, useActivities, useContact } from '@/hooks/useCRM';

type ContactData = NonNullable<ReturnType<typeof useContact>['data']>;
type AccountData = NonNullable<ReturnType<typeof useAccount>['data']>;
type ActivityItem = NonNullable<ReturnType<typeof useActivities>['data']>['data'][number];

interface OverviewTabProps {
  contact: ContactData;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
}

export function OverviewTab({ contact, isEditing, setIsEditing }: OverviewTabProps) {
  return (
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
  );
}

interface AccountTabProps {
  contact: ContactData;
  account: AccountData | undefined;
  orgPush: (path: string) => void;
}

export function AccountTab({ contact, account, orgPush }: AccountTabProps) {
  return (
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
  );
}

interface ActivitiesTabProps {
  activities: ActivityItem[];
  onLogActivity: () => void;
}

export function ActivitiesTab({ activities, onLogActivity }: ActivitiesTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Activities</CardTitle>
        <Button size="sm" variant="outline" onClick={onLogActivity}>
          <MessageSquarePlus className="h-4 w-4 mr-1" />
          Log Activity
        </Button>
      </CardHeader>
      <CardContent>
        <ActivityTimeline activities={activities} />
      </CardContent>
    </Card>
  );
}

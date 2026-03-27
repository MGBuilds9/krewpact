'use client';

import { Mail, Phone, Plus, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useContacts } from '@/hooks/useCRM';

type ContactItem = NonNullable<ReturnType<typeof useContacts>['data']>['data'][number];

interface ContactsTabProps {
  contacts: ContactItem[];
  accountId: string;
  orgPush: (path: string) => void;
}

export function ContactsTab({ contacts, accountId, orgPush }: ContactsTabProps) {
  return (
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
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No contacts yet</p>
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

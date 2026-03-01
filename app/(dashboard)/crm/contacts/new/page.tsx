'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ContactForm } from '@/components/CRM/ContactForm';
import type { Contact } from '@/hooks/useCRM';

export default function NewContactPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('account_id') ?? undefined;
  const leadId = searchParams.get('lead_id') ?? undefined;

  function handleSuccess(contact: Contact) {
    router.push(`/crm/contacts/${contact.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/crm/contacts')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Contact</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactForm
            defaultAccountId={accountId}
            defaultLeadId={leadId}
            onSuccess={handleSuccess}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}

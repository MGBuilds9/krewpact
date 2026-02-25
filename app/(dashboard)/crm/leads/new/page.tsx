'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LeadForm } from '@/components/CRM/LeadForm';
import type { Lead } from '@/hooks/useCRM';

export default function NewLeadPage() {
  const router = useRouter();

  function handleSuccess(lead: Lead) {
    router.push(`/crm/leads/${lead.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/crm/leads')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Lead</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadForm
            onSuccess={handleSuccess}
            onCancel={() => router.push('/crm/leads')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

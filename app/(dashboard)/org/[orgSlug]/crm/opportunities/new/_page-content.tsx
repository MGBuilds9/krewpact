'use client';

import { ArrowLeft } from 'lucide-react';

import { OpportunityForm } from '@/components/CRM/OpportunityForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Opportunity } from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

export default function NewOpportunityPage() {
  const { push: orgPush } = useOrgRouter();

  function handleSuccess(opportunity: Opportunity) {
    orgPush(`/crm/opportunities/${opportunity.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/crm/opportunities')}
          aria-label="Back to opportunities"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Opportunity</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <OpportunityForm
            onSuccess={handleSuccess}
            onCancel={() => orgPush('/crm/opportunities')}
          />
        </CardContent>
      </Card>
    </div>
  );
}

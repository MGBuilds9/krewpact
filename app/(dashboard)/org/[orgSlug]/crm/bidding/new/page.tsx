'use client';

import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useCreateBidding } from '@/hooks/useCRM';
import { BiddingForm } from '@/components/CRM/BiddingForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewBiddingPage() {
  const { push: orgPush } = useOrgRouter();
  const createBidding = useCreateBidding();

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      const result = await createBidding.mutateAsync(data as Parameters<typeof createBidding.mutateAsync>[0]);
      orgPush(`/crm/bidding/${result.id}`);
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/bidding')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">New Bidding Opportunity</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bid Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BiddingForm
            onSubmit={handleSubmit}
            isLoading={createBidding.isPending}
            submitLabel="Create Bid"
          />
        </CardContent>
      </Card>
    </div>
  );
}

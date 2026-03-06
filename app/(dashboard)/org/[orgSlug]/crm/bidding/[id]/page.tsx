'use client';

import { use } from 'react';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { useBiddingOpportunity, useUpdateBidding, useDeleteBidding } from '@/hooks/useCRM';
import { BiddingForm } from '@/components/CRM/BiddingForm';
import { BiddingStatusBadge } from '@/components/CRM/BiddingStatusBadge';
import { getDeadlineAlert, getSourceLabel } from '@/lib/crm/bidding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Clock, DollarSign, ExternalLink } from 'lucide-react';

export default function BiddingDetailPage({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}) {
  const { id } = use(params);
  const { push: orgPush } = useOrgRouter();
  const { data: bid, isLoading } = useBiddingOpportunity(id);
  const updateBidding = useUpdateBidding();
  const deleteBidding = useDeleteBidding();

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-muted rounded-lg" />;
  }

  if (!bid) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Bidding opportunity not found.
      </div>
    );
  }

  const deadlineAlert = getDeadlineAlert(bid.deadline);

  const handleUpdate = async (data: Record<string, unknown>) => {
    try {
      await updateBidding.mutateAsync({ id: bid.id, ...data } as Parameters<typeof updateBidding.mutateAsync>[0]);
    } catch {
      // Error handled by React Query
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this bidding opportunity? This cannot be undone.')) return;
    try {
      await deleteBidding.mutateAsync(bid.id);
      orgPush('/crm/bidding');
    } catch {
      // Error handled by React Query
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/bidding')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{bid.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <BiddingStatusBadge status={bid.status} />
              <span className="text-sm text-muted-foreground">
                {getSourceLabel(bid.source)}
              </span>
            </div>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bid.estimated_value != null && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Estimated Value</p>
                <p className="font-semibold">
                  {new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    maximumFractionDigits: 0,
                  }).format(bid.estimated_value)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {deadlineAlert && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className={`font-semibold ${deadlineAlert.level === 'urgent' ? 'text-red-600' : deadlineAlert.level === 'expired' ? 'text-gray-500' : ''}`}>
                  {deadlineAlert.label}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {bid.url && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Source Link</p>
                <a
                  href={bid.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  View listing
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BiddingForm
            defaultValues={bid}
            onSubmit={handleUpdate}
            isLoading={updateBidding.isPending}
            submitLabel="Update"
          />
        </CardContent>
      </Card>
    </div>
  );
}

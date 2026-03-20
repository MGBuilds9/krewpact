'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';

import { PoStatusBadge } from '@/components/inventory/po-status-badge';
import { ReceiveForm } from '@/components/inventory/receive-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { usePurchaseOrder } from '@/hooks/usePurchaseOrders';

export default function ReceivePageContent() {
  const params = useParams();
  const poId = params.poId as string;
  const { push: orgPush } = useOrgRouter();

  const { data: po, isLoading } = usePurchaseOrder(poId);

  const handleSuccess = useCallback(() => {
    // Allow brief time for the success message to show
    setTimeout(() => orgPush(`/inventory/purchase-orders/${poId}`), 2000);
  }, [orgPush, poId]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Purchase Order not found</h2>
        <Button onClick={() => orgPush('/inventory/purchase-orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush(`/inventory/purchase-orders/${poId}`)}
          aria-label="Back to PO detail"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Receive Materials</h1>
            <PoStatusBadge status={po.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {po.po_number} &middot; {po.supplier_name ?? 'Unknown supplier'}
          </p>
        </div>
      </div>
      <ReceiveForm po={po} onSuccess={handleSuccess} />
    </div>
  );
}

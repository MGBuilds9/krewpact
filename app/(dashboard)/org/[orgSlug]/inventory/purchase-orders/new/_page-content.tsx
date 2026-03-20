'use client';

import { ArrowLeft } from 'lucide-react';

import { PoForm } from '@/components/inventory/po-form';
import { Button } from '@/components/ui/button';
import { useOrgRouter } from '@/hooks/useOrgRouter';

export default function NewPoPageContent() {
  const { push: orgPush } = useOrgRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => orgPush('/inventory/purchase-orders')}
          aria-label="Back to purchase orders"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New Purchase Order</h1>
      </div>
      <PoForm />
    </div>
  );
}

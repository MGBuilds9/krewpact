'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ItemForm } from '@/components/inventory/item-form';
import { Button } from '@/components/ui/button';
import { useDivision } from '@/contexts/DivisionContext';
import { useCreateItem } from '@/hooks/useInventory';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { CreateItem } from '@/lib/validators/inventory-items';

export default function NewItemContent() {
  const { activeDivision } = useDivision();
  const { orgPath, push } = useOrgRouter();
  const createItem = useCreateItem();

  function handleSubmit(data: CreateItem) {
    createItem.mutate(data, {
      onSuccess: () => push('/inventory/items'),
    });
  }

  if (!activeDivision) {
    return <p className="text-muted-foreground">Select a division to create an item.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={orgPath('/inventory/items')}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Item</h1>
      </div>

      <ItemForm
        divisionId={activeDivision.id}
        onSubmit={handleSubmit}
        isSubmitting={createItem.isPending}
      />
    </div>
  );
}

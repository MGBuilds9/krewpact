'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ItemsTable } from '@/components/inventory/items-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDivision } from '@/contexts/DivisionContext';
import { useInventoryItems } from '@/hooks/useInventory';
import { useOrgRouter } from '@/hooks/useOrgRouter';

const TRACKING_OPTIONS = [
  { label: 'All Tracking', value: 'all' },
  { label: 'None', value: 'none' },
  { label: 'Serial', value: 'serial' },
  { label: 'Lot', value: 'lot' },
];

const STATUS_OPTIONS = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export default function ItemsPageContent() {
  const { activeDivision } = useDivision();
  const { orgPath } = useOrgRouter();
  const [search, setSearch] = useState('');
  const [trackingType, setTrackingType] = useState('all');
  const [isActive, setIsActive] = useState('all');

  const { data: items, isLoading } = useInventoryItems({
    divisionId: activeDivision?.id,
    search: search || undefined,
    trackingType: trackingType !== 'all' ? trackingType : undefined,
    isActive: isActive !== 'all' ? isActive === 'true' : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Items</h1>
        <Button asChild>
          <Link href={orgPath('/inventory/items/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Item
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={trackingType} onValueChange={setTrackingType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRACKING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={isActive} onValueChange={setIsActive}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ItemsTable items={items} isLoading={isLoading} />
    </div>
  );
}

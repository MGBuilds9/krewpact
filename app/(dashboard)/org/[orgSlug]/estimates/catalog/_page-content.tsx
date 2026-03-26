'use client';

import { DollarSign, Package, Plus, Search } from 'lucide-react';
import { useState } from 'react';

import { CostCatalogItemForm } from '@/components/Estimates/CostCatalogItemForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivision } from '@/contexts/DivisionContext';
import type { CostCatalogItem } from '@/hooks/useEstimating';
import { useCostCatalogItems } from '@/hooks/useEstimating';

const TYPE_BADGE_COLORS: Record<string, string> = {
  material: 'bg-blue-100 text-blue-700 border-blue-200',
  labor: 'bg-green-100 text-green-700 border-green-200',
  equipment: 'bg-orange-100 text-orange-700 border-orange-200',
  subcontract: 'bg-purple-100 text-purple-700 border-purple-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface CatalogItemCardProps {
  item: CostCatalogItem;
  onClick: () => void;
}
function CatalogItemCard({ item, onClick }: CatalogItemCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {item.item_code && (
            <span className="text-xs font-mono text-muted-foreground">{item.item_code}</span>
          )}
          <h3 className="font-semibold truncate">{item.item_name}</h3>
          <Badge
            variant="outline"
            className={`text-xs flex-shrink-0 border ${TYPE_BADGE_COLORS[item.item_type] || ''}`}
          >
            {item.item_type}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(item.base_cost)} / {item.unit}
          </span>
          {item.vendor_name && <span>{item.vendor_name}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

const ITEM_TYPES = ['material','labor','equipment','subcontract','other'] as const;

export default function CostCatalogPage() {
  const { activeDivision } = useDivision();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCatalogItem | undefined>();
  const divId = activeDivision?.id;
  const { data, isLoading } = useCostCatalogItems({ divisionId: divId, itemType: typeFilter !== 'all' ? typeFilter : undefined, search: search || undefined });
  const items = data?.data ?? [];

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 animate-pulse" />
      {['c1','c2','c3'].map((k) => <Skeleton key={k} className="h-16 rounded-xl animate-pulse" />)}
    </div>
  );

  const openEdit = (item?: CostCatalogItem) => { setEditingItem(item); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search catalog items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => openEdit()}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
      </div>
      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No catalog items yet</h3>
          <p className="text-muted-foreground mb-4">Add materials, labor rates, and equipment to your cost catalog</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">{items.map((item) => <CatalogItemCard key={item.id} item={item} onClick={() => openEdit(item)} />)}</div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Catalog Item' : 'Add Catalog Item'}</DialogTitle></DialogHeader>
          <CostCatalogItemForm item={editingItem} divisionId={divId} onSuccess={() => setDialogOpen(false)} onCancel={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

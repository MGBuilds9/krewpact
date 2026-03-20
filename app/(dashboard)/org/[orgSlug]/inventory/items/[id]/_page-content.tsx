'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInventoryItem, useInventoryStock } from '@/hooks/useInventory';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { formatCurrency, formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';

const TABS = ['Details', 'Stock', 'History'] as const;
type Tab = (typeof TABS)[number];

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '--'}</p>
    </div>
  );
}

function DetailsTab({ item }: { item: NonNullable<ReturnType<typeof useInventoryItem>['data']> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="SKU" value={item.sku} />
        <DetailField label="Name" value={item.name} />
        <DetailField label="Category" value={item.category} />
        <DetailField label="UOM" value={item.uom} />
        <DetailField label="Tracking Type" value={item.tracking_type} />
        <DetailField
          label="Unit Cost"
          value={item.unit_cost != null ? formatCurrency(item.unit_cost) : null}
        />
        <DetailField label="Min Stock" value={item.min_stock_level} />
        <DetailField label="Max Stock" value={item.max_stock_level} />
        <DetailField label="Reorder Point" value={item.reorder_point} />
        <DetailField label="Reorder Qty" value={item.reorder_qty} />
        <DetailField label="Created" value={formatDate(item.created_at)} />
        <DetailField label="Updated" value={formatDate(item.updated_at)} />
      </CardContent>
    </Card>
  );
}

function StockTab({ itemId }: { itemId: string }) {
  const { data: stock, isLoading } = useInventoryStock({ itemId });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }, (_, i) => `s-${i}`).map((k) => (
                <TableRow key={k}>
                  {Array.from({ length: 5 }, (_, j) => `c-${j}`).map((ck) => (
                    <TableCell key={ck}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && !stock?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No stock recorded for this item
                </TableCell>
              </TableRow>
            )}
            {stock?.map((s) => (
              <TableRow key={s.location_id}>
                <TableCell className="font-medium">{s.location_name}</TableCell>
                <TableCell className="text-right font-mono">{s.qty_on_hand}</TableCell>
                <TableCell className="text-right font-mono">{s.qty_reserved}</TableCell>
                <TableCell className="text-right font-mono">{s.qty_available}</TableCell>
                <TableCell className="text-right">
                  {s.total_value != null ? formatCurrency(s.total_value) : '--'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HistoryTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Transaction history will be available after ledger transactions are recorded.
        </p>
      </CardContent>
    </Card>
  );
}

export default function ItemDetailContent() {
  const params = useParams();
  const itemId = params.id as string;
  const { orgPath } = useOrgRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Details');
  const { data: item, isLoading } = useInventoryItem(itemId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Item not found</p>
        <Button variant="outline" asChild>
          <Link href={orgPath('/inventory/items')}>Back to Items</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={orgPath('/inventory/items')}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{item.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{item.sku}</p>
        </div>
        <Badge variant={item.is_active ? 'default' : 'secondary'} className="ml-auto">
          {item.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <nav className="inline-flex rounded-md bg-muted p-1 gap-0.5">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50',
            )}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Details' && <DetailsTab item={item} />}
      {activeTab === 'Stock' && <StockTab itemId={itemId} />}
      {activeTab === 'History' && <HistoryTab />}
    </div>
  );
}

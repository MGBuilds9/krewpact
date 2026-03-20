'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InventoryItem } from '@/hooks/useInventory';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { formatCurrency } from '@/lib/date';

interface ItemsTableProps {
  items: InventoryItem[] | undefined;
  isLoading: boolean;
}

function TrackingBadge({ type }: { type: string }) {
  const variant = type === 'serial' ? 'default' : type === 'lot' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{type}</Badge>;
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
        <TableRow key={key}>
          {Array.from({ length: 7 }, (_, j) => `cell-${j}`).map((cellKey) => (
            <TableCell key={cellKey}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function ItemsTable({ items, isLoading }: ItemsTableProps) {
  const { orgPath } = useOrgRouter();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead>Tracking</TableHead>
            <TableHead className="text-right">Unit Cost</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableSkeleton />}
          {!isLoading && items?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No items found
              </TableCell>
            </TableRow>
          )}
          {items?.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-sm">
                <Link
                  href={orgPath(`/inventory/items/${item.id}`)}
                  className="text-primary hover:underline"
                >
                  {item.sku}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.uom}</TableCell>
              <TableCell>
                <TrackingBadge type={item.tracking_type} />
              </TableCell>
              <TableCell className="text-right">
                {item.unit_cost != null ? formatCurrency(item.unit_cost) : '--'}
              </TableCell>
              <TableCell>
                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

'use client';

import { AlertTriangle, ArrowRight, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { StockCard } from '@/components/inventory/stock-card';
import { PageHeader } from '@/components/shared/PageHeader';
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
import { useDivision } from '@/contexts/DivisionContext';
import { useInventoryItems, useInventoryStock, useLowStockItems } from '@/hooks/useInventory';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { formatCurrency } from '@/lib/date';

function QuickActions() {
  const { orgPath } = useOrgRouter();

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild>
        <Link href={orgPath('/inventory/items/new')}>
          <Package className="mr-2 h-4 w-4" />
          New Item
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={orgPath('/inventory/purchase-orders')}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Create PO
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={orgPath('/inventory/receive')}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Receive Materials
        </Link>
      </Button>
    </div>
  );
}

function LowStockAlerts({ divisionId }: { divisionId?: string }) {
  const { data: lowStock, isLoading } = useLowStockItems(divisionId);
  const { orgPath } = useOrgRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Low Stock Alerts
        </CardTitle>
        {(lowStock?.length ?? 0) > 0 && <Badge variant="destructive">{lowStock?.length}</Badge>}
      </CardHeader>
      <CardContent>
        {!lowStock?.length ? (
          <p className="text-sm text-muted-foreground">All items above minimum levels</p>
        ) : (
          <div className="space-y-2">
            {lowStock.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={orgPath(`/inventory/items/${item.id}`)}
                className="flex items-center justify-between text-sm hover:bg-accent rounded p-2 -mx-2"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-destructive font-mono">
                  {item.qty_on_hand} / {item.min_stock_level}
                </span>
              </Link>
            ))}
            {lowStock.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href={orgPath('/inventory/items?filter=low_stock')}>
                  View all {lowStock.length} alerts <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentStockTable({ divisionId }: { divisionId?: string }) {
  const { data: stock, isLoading } = useInventoryStock({ divisionId, limit: 10 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Stock Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => `skel-${i}`).map((key) => (
                <TableRow key={key}>
                  {Array.from({ length: 5 }, (_, j) => `c-${j}`).map((ck) => (
                    <TableCell key={ck}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && stock?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  No stock data available
                </TableCell>
              </TableRow>
            )}
            {stock?.map((s) => (
              <TableRow key={`${s.item_id}-${s.location_id}`}>
                <TableCell>
                  <div>
                    <p className="font-medium">{s.item_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.item_sku}</p>
                  </div>
                </TableCell>
                <TableCell>{s.location_name}</TableCell>
                <TableCell className="text-right font-mono">{s.qty_on_hand}</TableCell>
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

export default function OverviewPageContent() {
  const { activeDivision } = useDivision();
  const divisionId = activeDivision?.id;
  const { data: items, isLoading: itemsLoading } = useInventoryItems({ divisionId, limit: 1 });
  const { data: lowStock, isLoading: lowStockLoading } = useLowStockItems(divisionId);
  const { data: stock, isLoading: stockLoading } = useInventoryStock({ divisionId, limit: 1 });
  const { data: poData, isLoading: poLoading } = usePurchaseOrders({ status: 'submitted', limit: 100 });
  const activePOCount = (poData?.length ?? 0);

  const summaryLoading = itemsLoading || lowStockLoading || stockLoading || poLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Overview" action={<QuickActions />} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StockCard label="Total Items" value={items?.length ?? 0} isLoading={summaryLoading} />
        <StockCard
          label="Low Stock Alerts"
          value={lowStock?.length ?? 0}
          isLoading={summaryLoading}
        />
        <StockCard label="Stock Positions" value={stock?.length ?? 0} isLoading={summaryLoading} />
        <StockCard label="Active POs" value={activePOCount} isLoading={summaryLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LowStockAlerts divisionId={divisionId} />
        <RecentStockTable divisionId={divisionId} />
      </div>
    </div>
  );
}

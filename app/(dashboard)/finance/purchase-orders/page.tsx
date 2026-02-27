'use client';

import { usePOSnapshots } from '@/hooks/useFinance';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  approved: 'default',
  submitted: 'secondary',
  received: 'default',
  draft: 'outline',
  closed: 'outline',
  cancelled: 'destructive',
};

function formatCAD(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export default function PurchaseOrdersPage() {
  const { data, isLoading, error } = usePOSnapshots();

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading purchase orders...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load purchase orders.</div>;

  const pos = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Purchase Order Snapshots</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data?.total ?? 0} PO snapshots synced from ERPNext
        </p>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>PO Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No purchase order snapshots found.
                </TableCell>
              </TableRow>
            ) : (
              pos.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name ?? '—'}</TableCell>
                  <TableCell>{po.po_date ?? '—'}</TableCell>
                  <TableCell>
                    {po.status ? (
                      <Badge variant={STATUS_VARIANT[po.status] ?? 'outline'}>{po.status}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatCAD(po.subtotal_amount)}</TableCell>
                  <TableCell className="text-right">{formatCAD(po.tax_amount)}</TableCell>
                  <TableCell className="text-right">{formatCAD(po.total_amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

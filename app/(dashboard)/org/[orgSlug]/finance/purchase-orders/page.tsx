'use client';

import { useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { POSnapshotReviewForm } from '@/components/Finance/POSnapshotReviewForm';

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
  const [selectedPO, setSelectedPO] = useState<Record<string, unknown> | null>(null);

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
                <TableRow
                  key={po.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPO(po as unknown as Record<string, unknown>)}
                >
                  <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name ?? '—'}</TableCell>
                  <TableCell>{po.po_date ?? '—'}</TableCell>
                  <TableCell>
                    {po.status ? (
                      <Badge variant={STATUS_VARIANT[po.status] ?? 'outline'}>{po.status}</Badge>
                    ) : (
                      '—'
                    )}
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

      <Dialog open={!!selectedPO} onOpenChange={(open) => !open && setSelectedPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Detail</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <POSnapshotReviewForm
              defaultValues={{
                po_number: (selectedPO.po_number as string) ?? '',
                supplier_name: (selectedPO.supplier_name as string) ?? '',
                po_date: (selectedPO.po_date as string) ?? '',
                status: selectedPO.status as
                  | 'draft'
                  | 'submitted'
                  | 'approved'
                  | 'received'
                  | 'closed'
                  | 'cancelled'
                  | undefined,
                subtotal_amount:
                  selectedPO.subtotal_amount != null ? String(selectedPO.subtotal_amount) : '',
                tax_amount: selectedPO.tax_amount != null ? String(selectedPO.tax_amount) : '',
                total_amount:
                  selectedPO.total_amount != null ? String(selectedPO.total_amount) : '',
                erp_docname: (selectedPO.erp_docname as string) ?? '',
              }}
              onSubmit={() => setSelectedPO(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

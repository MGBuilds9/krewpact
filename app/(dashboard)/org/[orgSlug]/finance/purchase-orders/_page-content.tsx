'use client';

import { useState } from 'react';

import { POSnapshotReviewForm } from '@/components/Finance/POSnapshotReviewForm';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePOSnapshots } from '@/hooks/useFinance';

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

type PO = {
  id: string;
  po_number: string;
  supplier_name?: string | null;
  po_date?: string | null;
  status?: string | null;
  subtotal_amount?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  erp_docname?: string | null;
};

function PORow({ po, onClick }: { po: PO; onClick: () => void }) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-mono text-sm">{po.po_number}</TableCell>
      <TableCell>{po.supplier_name || '—'}</TableCell>
      <TableCell>{po.po_date || '—'}</TableCell>
      <TableCell>
        {po.status ? (
          <Badge variant={STATUS_VARIANT[po.status] || 'outline'}>{po.status}</Badge>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="text-right">{formatCAD(po.subtotal_amount || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(po.tax_amount || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(po.total_amount || null)}</TableCell>
    </TableRow>
  );
}

function buildPOFormValues(po: PO) {
  return {
    po_number: po.po_number || '',
    supplier_name: po.supplier_name || '',
    po_date: po.po_date || '',
    status: po.status as
      | 'draft'
      | 'submitted'
      | 'approved'
      | 'received'
      | 'closed'
      | 'cancelled'
      | undefined,
    subtotal_amount: po.subtotal_amount != null ? String(po.subtotal_amount) : '',
    tax_amount: po.tax_amount != null ? String(po.tax_amount) : '',
    total_amount: po.total_amount != null ? String(po.total_amount) : '',
    erp_docname: po.erp_docname || '',
  };
}

export default function PurchaseOrdersPage() {
  const { data, isLoading, error } = usePOSnapshots();
  const [selectedPO, setSelectedPO] = useState<PO | null>(null);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading purchase orders...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load purchase orders.</div>;

  const pos = data ? data.data || [] : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Purchase Order Snapshots</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data ? data.total || 0 : 0} PO snapshots synced from ERPNext
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
                <PORow key={po.id} po={po as PO} onClick={() => setSelectedPO(po as PO)} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={!!selectedPO}
        onOpenChange={(open) => {
          if (!open) setSelectedPO(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Detail</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <POSnapshotReviewForm
              defaultValues={buildPOFormValues(selectedPO)}
              onSubmit={() => setSelectedPO(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

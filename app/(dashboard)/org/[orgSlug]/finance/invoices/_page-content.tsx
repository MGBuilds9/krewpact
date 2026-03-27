'use client';

import { useState } from 'react';

import { InvoiceSnapshotReviewForm } from '@/components/Finance/InvoiceSnapshotReviewForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInvoiceSnapshots } from '@/hooks/useFinance';

function formatCAD(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  total_amount?: number | null;
  amount_paid?: number | null;
  subtotal_amount?: number | null;
  tax_amount?: number | null;
  erp_docname?: string | null;
};

function InvoiceRow({ inv, onClick }: { inv: Invoice; onClick: () => void }) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
      <TableCell>{inv.customer_name || '—'}</TableCell>
      <TableCell>{inv.invoice_date || '—'}</TableCell>
      <TableCell>{inv.due_date || '—'}</TableCell>
      <TableCell>{inv.status ? <StatusBadge status={inv.status} /> : '—'}</TableCell>
      <TableCell className="text-right">{formatCAD(inv.total_amount || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(inv.amount_paid || null)}</TableCell>
    </TableRow>
  );
}

function buildInvoiceFormValues(inv: Invoice) {
  return {
    invoice_number: inv.invoice_number || '',
    customer_name: inv.customer_name || '',
    invoice_date: inv.invoice_date || '',
    due_date: inv.due_date || '',
    status: inv.status as 'draft' | 'submitted' | 'paid' | 'overdue' | 'cancelled' | undefined,
    subtotal_amount: inv.subtotal_amount != null ? String(inv.subtotal_amount) : '',
    tax_amount: inv.tax_amount != null ? String(inv.tax_amount) : '',
    total_amount: inv.total_amount != null ? String(inv.total_amount) : '',
    amount_paid: inv.amount_paid != null ? String(inv.amount_paid) : '',
    erp_docname: inv.erp_docname || '',
  };
}

export default function InvoicesPage() {
  const { data, isLoading, error } = useInvoiceSnapshots();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading invoices...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load invoices.</div>;

  const invoices = data ? data.data || [] : [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Invoice Snapshots"
        description={`${data ? data.total || 0 : 0} invoice snapshots synced from ERPNext`}
      />
      <div className="bg-white dark:bg-card border shadow-sm rounded-2xl overflow-x-auto w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No invoice snapshots found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv as Invoice}
                  onClick={() => setSelectedInvoice(inv as Invoice)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Detail</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceSnapshotReviewForm
              defaultValues={buildInvoiceFormValues(selectedInvoice)}
              onSubmit={() => setSelectedInvoice(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

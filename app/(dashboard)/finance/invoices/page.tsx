'use client';

import { useInvoiceSnapshots } from '@/hooks/useFinance';
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
  paid: 'default',
  submitted: 'secondary',
  draft: 'outline',
  overdue: 'destructive',
  cancelled: 'outline',
};

function formatCAD(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

export default function InvoicesPage() {
  const { data, isLoading, error } = useInvoiceSnapshots();

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading invoices...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load invoices.</div>;

  const invoices = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoice Snapshots</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data?.total ?? 0} invoice snapshots synced from ERPNext
        </p>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
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
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customer_name ?? '—'}</TableCell>
                  <TableCell>{inv.invoice_date ?? '—'}</TableCell>
                  <TableCell>{inv.due_date ?? '—'}</TableCell>
                  <TableCell>
                    {inv.status ? (
                      <Badge variant={STATUS_VARIANT[inv.status] ?? 'outline'}>
                        {inv.status}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatCAD(inv.total_amount)}</TableCell>
                  <TableCell className="text-right">{formatCAD(inv.amount_paid)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

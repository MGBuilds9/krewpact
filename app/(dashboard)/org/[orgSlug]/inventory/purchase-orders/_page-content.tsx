'use client';

import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { fmtCAD } from '@/components/inventory/currency-format';
import { PoStatusBadge } from '@/components/inventory/po-status-badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useOrgRouter } from '@/hooks/useOrgRouter';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';

const PO_STATUSES = [
  { value: '_all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'ordered', label: 'Ordered' },
  { value: 'partial_received', label: 'Partially Received' },
  { value: 'received', label: 'Fully Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

// eslint-disable-next-line max-lines-per-function
export default function PurchaseOrdersPageContent() {
  const { push: orgPush } = useOrgRouter();
  const { activeDivision } = useDivision();
  const [statusFilter, setStatusFilter] = useState('_all');

  const { data: pos, isLoading } = usePurchaseOrders({
    divisionId: activeDivision?.id,
    status: statusFilter === '_all' ? undefined : statusFilter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        action={
          <Button onClick={() => orgPush('/inventory/purchase-orders/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Create PO
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PO_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {['s0', 's1', 's2', 's3', 's4'].map((k) => (
            <Skeleton key={k} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !pos?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No purchase orders found. Create your first PO to get started.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {['PO Number', 'Supplier', 'Date', 'Status'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => (
                <TableRow
                  key={po.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => orgPush(`/inventory/purchase-orders/${po.id}`)}
                >
                  <TableCell className="font-medium">{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name ?? '—'}</TableCell>
                  <TableCell>
                    {po.order_date ? format(new Date(po.order_date), 'MMM d, yyyy') : '—'}
                  </TableCell>
                  <TableCell>
                    <PoStatusBadge status={po.status} />
                  </TableCell>
                  <TableCell className="text-right">{fmtCAD(po.total_amount)}</TableCell>
                  <TableCell className="text-right">{po.lines?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

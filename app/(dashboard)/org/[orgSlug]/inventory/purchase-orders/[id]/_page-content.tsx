'use client';

import { format } from 'date-fns';
import { ArrowLeft, Package, Send, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';

import { fmtCAD } from '@/components/inventory/currency-format';
import { PoStatusBadge } from '@/components/inventory/po-status-badge';
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
import { useOrgRouter } from '@/hooks/useOrgRouter';
import {
  useApprovePo,
  useCancelPo,
  usePurchaseOrder,
  useSubmitPo,
} from '@/hooks/usePurchaseOrders';

export default function PoDetailPageContent() {
  const params = useParams();
  const poId = params.id as string;
  const { push: orgPush } = useOrgRouter();

  const { data: po, isLoading } = usePurchaseOrder(poId);
  const submitPo = useSubmitPo();
  const approvePo = useApprovePo();
  const cancelPo = useCancelPo();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Purchase Order not found</h2>
        <p className="text-muted-foreground mb-4">
          This PO may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/inventory/purchase-orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  const isMutating = submitPo.isPending || approvePo.isPending || cancelPo.isPending;

  return (
    <div className="space-y-6">
      <PoDetailHeader
        po={po}
        isMutating={isMutating}
        onBack={() => orgPush('/inventory/purchase-orders')}
        onSubmit={() => submitPo.mutate(po.id)}
        onApprove={() => approvePo.mutate(po.id)}
        onCancel={() => cancelPo.mutate(po.id)}
        onReceive={() => orgPush(`/inventory/receive/${po.id}`)}
      />
      <PoLinesTable lines={po.lines} />
      <PoSummaryCard po={po} />
    </div>
  );
}

interface PoDetailHeaderProps {
  po: NonNullable<ReturnType<typeof usePurchaseOrder>['data']>;
  isMutating: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onCancel: () => void;
  onReceive: () => void;
}

function PoDetailHeader({
  po,
  isMutating,
  onBack,
  onSubmit,
  onApprove,
  onCancel,
  onReceive,
}: PoDetailHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{po.po_number}</h1>
            <PoStatusBadge status={po.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {po.supplier_name ?? 'No supplier'} &middot;{' '}
            {po.order_date ? format(new Date(po.order_date), 'MMM d, yyyy') : 'No date'}
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {po.status === 'draft' && (
          <>
            <Button size="sm" onClick={onSubmit} disabled={isMutating}>
              <Send className="h-4 w-4 mr-1" />
              Submit
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancel} disabled={isMutating}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </>
        )}
        {po.status === 'submitted' && (
          <>
            <Button size="sm" onClick={onApprove} disabled={isMutating}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={onCancel} disabled={isMutating}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </>
        )}
        {(po.status === 'approved' ||
          po.status === 'ordered' ||
          po.status === 'partial_received') && (
          <Button size="sm" onClick={onReceive}>
            <Package className="h-4 w-4 mr-1" />
            Receive Materials
          </Button>
        )}
      </div>
    </div>
  );
}

interface PoLinesTableProps {
  lines: NonNullable<ReturnType<typeof usePurchaseOrder>['data']>['lines'];
}

function PoLinesTable({ lines }: PoLinesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Line Items</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.item_sku}</TableCell>
                  <TableCell>{line.item_name}</TableCell>
                  <TableCell className="text-right">{line.qty_ordered}</TableCell>
                  <TableCell className="text-right">{line.qty_received}</TableCell>
                  <TableCell className="text-right">{fmtCAD(line.unit_cost)}</TableCell>
                  <TableCell className="text-right">{fmtCAD(line.total_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface PoSummaryCardProps {
  po: NonNullable<ReturnType<typeof usePurchaseOrder>['data']>;
}

function PoSummaryCard({ po }: PoSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{fmtCAD(po.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tax</dt>
            <dd className="font-medium">{fmtCAD(po.tax_amount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-lg font-bold">{fmtCAD(po.total_amount)}</dd>
          </div>
          {po.notes && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{po.notes}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

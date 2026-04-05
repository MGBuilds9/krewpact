'use client';

import { CreditCard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentHistory } from '@/hooks/useFinancialOps';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { PaymentEntry } from '@/lib/services/financial-ops';
import { cn } from '@/lib/utils';

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 border-green-300',
  submitted: 'bg-blue-100 text-blue-700 border-blue-300',
  overdue: 'bg-red-100 text-red-700 border-red-300',
  draft: 'bg-zinc-100 text-zinc-700 border-zinc-300',
};

function PaymentRow({ entry }: { entry: PaymentEntry }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{entry.invoiceNumber}</p>
          {entry.customerName && (
            <p className="text-xs text-muted-foreground truncate">{entry.customerName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(entry.paymentDate).toLocaleDateString('en-CA')}
          </p>
          {entry.erpDocname && (
            <p className="text-xs text-muted-foreground font-mono">{entry.erpDocname}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-sm font-semibold tabular-nums text-green-700">
          +{CAD.format(entry.amountPaid)}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'border text-xs',
            STATUS_COLORS[entry.status] ?? 'bg-zinc-100 text-zinc-700 border-zinc-300',
          )}
        >
          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
        </Badge>
      </div>
    </div>
  );
}

interface PaymentTimelineProps {
  projectId: string;
}

export function PaymentTimeline({ projectId }: PaymentTimelineProps) {
  const { data, isLoading } = usePaymentHistory(projectId);
  const { push } = useOrgRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Payment Timeline</CardTitle>
          {data && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">
                Received: {CAD.format(data.totalPaid)}
              </span>
              <span className="text-muted-foreground">
                Outstanding: {CAD.format(data.totalOutstanding)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!data?.payments.length ? (
          <EmptyState
            icon={CreditCard}
            title="No payments recorded"
            description="Payments will appear here as invoices are collected."
            primaryAction={{ label: 'Go to Finance', onClick: () => push('/finance') }}
          />
        ) : (
          data.payments.map((entry) => <PaymentRow key={entry.id} entry={entry} />)
        )}
      </CardContent>
    </Card>
  );
}

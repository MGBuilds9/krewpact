'use client';

import { BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAgedReceivables } from '@/hooks/useFinancialOps';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { AgedReceivablesRow } from '@/lib/services/financial-ops';
import { cn } from '@/lib/utils';

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

function amountCell(value: number) {
  return (
    <span className={cn('tabular-nums', value > 0 ? 'text-foreground' : 'text-muted-foreground')}>
      {value > 0 ? CAD.format(value) : '—'}
    </span>
  );
}

interface AgedReceivablesReportProps {
  orgId?: string;
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((n) => (
        <TableRow key={n}>
          {[0, 1, 2, 3, 4, 5].map((c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function SummaryCards({ rows }: { rows: AgedReceivablesRow[] }) {
  const totals = rows.reduce(
    (acc, r) => ({
      current: acc.current + r.current,
      days30: acc.days30 + r.days30,
      days60: acc.days60 + r.days60,
      days90plus: acc.days90plus + r.days90plus,
      total: acc.total + r.total,
    }),
    { current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 },
  );

  const cards = [
    { label: 'Current', value: totals.current, color: 'text-green-600' },
    { label: '1–30 Days', value: totals.days30, color: 'text-amber-500' },
    { label: '31–60 Days', value: totals.days60, color: 'text-orange-500' },
    { label: '90+ Days', value: totals.days90plus, color: 'text-red-600' },
    { label: 'Total AR', value: totals.total, color: 'text-foreground font-semibold' },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
      {cards.map(({ label, value, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-sm mt-1 tabular-nums', color)}>{CAD.format(value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AgedReceivablesReport({ orgId }: AgedReceivablesReportProps) {
  const { data, isLoading } = useAgedReceivables(orgId);
  const { push } = useOrgRouter();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Aged Receivables</CardTitle>
          {data?.asOf && (
            <span className="text-xs text-muted-foreground">
              As of {new Date(data.asOf).toLocaleDateString('en-CA')}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isLoading && data?.rows && data.rows.length > 0 && <SummaryCards rows={data.rows} />}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">1–30 Days</TableHead>
              <TableHead className="text-right">31–60 Days</TableHead>
              <TableHead className="text-right">90+ Days</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : !data?.rows.length ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={BarChart3}
                    title="No outstanding receivables"
                    description="All invoices are current or paid."
                    primaryAction={{ label: 'Go to Finance', onClick: () => push('/finance') }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow key={row.customerId}>
                  <TableCell className="font-medium">{row.customerName}</TableCell>
                  <TableCell className="text-right">{amountCell(row.current)}</TableCell>
                  <TableCell className="text-right">{amountCell(row.days30)}</TableCell>
                  <TableCell className="text-right">{amountCell(row.days60)}</TableCell>
                  <TableCell className="text-right">{amountCell(row.days90plus)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {CAD.format(row.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

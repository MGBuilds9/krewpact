'use client';

import { format } from 'date-fns';
import { useState } from 'react';

import { fmtCAD } from '@/components/inventory/currency-format';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useTransactionLedger } from '@/hooks/useTransactionLedger';
import { cn } from '@/lib/utils';

const TXN_TYPES = [
  { value: '_all', label: 'All Types' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'issue', label: 'Issue' },
  { value: 'return', label: 'Return' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'checkin', label: 'Check-in' },
];

const TXN_BADGE_COLORS: Record<string, string> = {
  receipt: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  issue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  return: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  transfer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  checkout: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  checkin: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

export default function TransactionsPageContent() {
  const { activeDivision } = useDivision();
  const [typeFilter, setTypeFilter] = useState('_all');
  const [search, setSearch] = useState('');

  const { data: transactions, isLoading } = useTransactionLedger({
    divisionId: activeDivision?.id,
    txnType: typeFilter === '_all' ? undefined : typeFilter,
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Transaction History</h2>

      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TXN_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !transactions?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No transactions found. Inventory movements will appear here.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Project</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>{format(new Date(txn.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('border', TXN_BADGE_COLORS[txn.txn_type] ?? '')}
                    >
                      {txn.txn_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{txn.item_name ?? txn.item_id}</span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-mono',
                      txn.qty > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {txn.qty > 0 ? '+' : ''}
                    {txn.qty}
                  </TableCell>
                  <TableCell className="text-right">
                    {txn.unit_cost != null ? fmtCAD(Math.abs(txn.qty) * txn.unit_cost) : '—'}
                  </TableCell>
                  <TableCell>{txn.location_name ?? '—'}</TableCell>
                  <TableCell>{txn.project_name ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

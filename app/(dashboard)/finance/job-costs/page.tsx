'use client';

import { useJobCostSnapshots } from '@/hooks/useFinance';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatCAD(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

function formatPct(pct: number | null) {
  if (pct == null) return '—';
  return `${pct.toFixed(1)}%`;
}

export default function JobCostsPage() {
  const { data, isLoading, error } = useJobCostSnapshots();

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading job cost snapshots...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load job cost snapshots.</div>;

  const snapshots = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Job Cost Snapshots</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data?.total ?? 0} budget vs actuals snapshots
        </p>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot Date</TableHead>
              <TableHead className="text-right">Baseline Budget</TableHead>
              <TableHead className="text-right">Revised Budget</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Actual Cost</TableHead>
              <TableHead className="text-right">Forecast</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No job cost snapshots found.
                </TableCell>
              </TableRow>
            ) : (
              snapshots.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.snapshot_date}</TableCell>
                  <TableCell className="text-right">{formatCAD(s.baseline_budget)}</TableCell>
                  <TableCell className="text-right">{formatCAD(s.revised_budget)}</TableCell>
                  <TableCell className="text-right">{formatCAD(s.committed_cost)}</TableCell>
                  <TableCell className="text-right">{formatCAD(s.actual_cost)}</TableCell>
                  <TableCell className="text-right">{formatCAD(s.forecast_cost)}</TableCell>
                  <TableCell className="text-right">{formatPct(s.forecast_margin_pct)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

import { JobCostSnapshotForm } from '@/components/Finance/JobCostSnapshotForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useJobCostSnapshots } from '@/hooks/useFinance';

function formatCAD(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}
function formatPct(pct: number | null) {
  if (pct == null) return '—';
  return `${pct.toFixed(1)}%`;
}

type Snapshot = {
  id: string;
  snapshot_date: string;
  baseline_budget?: number | null;
  revised_budget?: number | null;
  committed_cost?: number | null;
  actual_cost?: number | null;
  forecast_cost?: number | null;
  forecast_margin_pct?: number | null;
};

function SnapshotRow({ s, onClick }: { s: Snapshot; onClick: () => void }) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell>{s.snapshot_date}</TableCell>
      <TableCell className="text-right">{formatCAD(s.baseline_budget || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(s.revised_budget || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(s.committed_cost || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(s.actual_cost || null)}</TableCell>
      <TableCell className="text-right">{formatCAD(s.forecast_cost || null)}</TableCell>
      <TableCell className="text-right">{formatPct(s.forecast_margin_pct || null)}</TableCell>
    </TableRow>
  );
}

function buildSnapshotFormValues(s: Snapshot) {
  return {
    snapshot_date: s.snapshot_date || '',
    baseline_budget: s.baseline_budget != null ? String(s.baseline_budget) : '',
    revised_budget: s.revised_budget != null ? String(s.revised_budget) : '',
    committed_cost: s.committed_cost != null ? String(s.committed_cost) : '',
    actual_cost: s.actual_cost != null ? String(s.actual_cost) : '',
    forecast_cost: s.forecast_cost != null ? String(s.forecast_cost) : '',
    forecast_margin_pct: s.forecast_margin_pct != null ? String(s.forecast_margin_pct) : '',
  };
}

export default function JobCostsPage() {
  const { data, isLoading, error } = useJobCostSnapshots();
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);

  if (isLoading)
    return <div className="p-6 text-muted-foreground">Loading job cost snapshots...</div>;
  if (error) return <div className="p-6 text-destructive">Failed to load job cost snapshots.</div>;

  const snapshots = data ? data.data || [] : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Job Cost Snapshots</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {data ? data.total || 0 : 0} budget vs actuals snapshots
        </p>
      </div>
      <div className="bg-white dark:bg-card border shadow-sm rounded-2xl overflow-x-auto w-full">
        <Table className="min-w-[800px]">
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
                <SnapshotRow
                  key={s.id}
                  s={s as Snapshot}
                  onClick={() => setSelectedSnapshot(s as Snapshot)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog
        open={!!selectedSnapshot}
        onOpenChange={(open) => {
          if (!open) setSelectedSnapshot(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Job Cost Snapshot Detail</DialogTitle>
          </DialogHeader>
          {selectedSnapshot && (
            <JobCostSnapshotForm
              defaultValues={buildSnapshotFormValues(selectedSnapshot)}
              onSubmit={() => setSelectedSnapshot(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

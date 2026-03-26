'use client';

import { CheckCircle, Download, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useApproveBatch, useExportBatchToADP } from '@/hooks/usePayroll';
import type { TimesheetBatch } from '@/hooks/useTimeExpense';

// ─── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  TimesheetBatch['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  submitted: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  exported: 'default',
};

function BatchStatusBadge({ status }: { status: TimesheetBatch['status'] }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface TimesheetBatchTableProps {
  batches: TimesheetBatch[];
  isLoading?: boolean;
  canApprove?: boolean;
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function TimesheetBatchSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </TableCell>
              <TableCell>
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Reject Dialog ─────────────────────────────────────────────────────────────

interface RejectDialogProps {
  rejectTarget: string | null;
  rejectReason: string;
  isPending: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function RejectBatchDialog({
  rejectTarget,
  rejectReason,
  isPending,
  onReasonChange,
  onClose,
  onSubmit,
}: RejectDialogProps) {
  return (
    <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Timesheet Batch</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this batch. The submitter will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reject-reason">Reason</Label>
          <Input
            id="reject-reason"
            placeholder="e.g. Missing overtime entries for week of Mar 10"
            value={rejectReason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onSubmit}
            disabled={!rejectReason.trim() || isPending}
          >
            Reject Batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Batch Row ─────────────────────────────────────────────────────────────────

interface BatchRowProps {
  batch: TimesheetBatch;
  canApprove: boolean;
  approvePending: boolean;
  exportPending: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onExport: (id: string) => void;
}

function BatchRow({
  batch,
  canApprove,
  approvePending,
  exportPending,
  onApprove,
  onReject,
  onExport,
}: BatchRowProps) {
  return (
    <TableRow key={batch.id}>
      <TableCell className="font-medium">
        {batch.period_start} – {batch.period_end}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{batch.division_id}</TableCell>
      <TableCell>
        <BatchStatusBadge status={batch.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{batch.submitted_by ?? '—'}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {canApprove && batch.status === 'submitted' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApprove(batch.id)}
                disabled={approvePending}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => onReject(batch.id)}
                disabled={approvePending}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {batch.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExport(batch.id)}
              disabled={exportPending}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Export ADP
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function TimesheetBatchTable({
  batches,
  isLoading,
  canApprove = false,
}: TimesheetBatchTableProps) {
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approveMutation = useApproveBatch();
  const exportMutation = useExportBatchToADP();

  function handleApprove(id: string) {
    approveMutation.mutate({ id, status: 'approved' });
  }

  function handleRejectSubmit() {
    if (!rejectTarget || !rejectReason.trim()) return;
    approveMutation.mutate(
      { id: rejectTarget, status: 'rejected', reason: rejectReason.trim() },
      { onSettled: () => { setRejectTarget(null); setRejectReason(''); } },
    );
  }

  function handleExport(id: string) {
    exportMutation.mutate(id, {
      onSuccess: ({ csv, filename }) => triggerCsvDownload(csv, filename),
    });
  }

  if (isLoading) return <TimesheetBatchSkeleton />;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No timesheet batches found.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => (
                <BatchRow
                  key={batch.id}
                  batch={batch}
                  canApprove={canApprove}
                  approvePending={approveMutation.isPending}
                  exportPending={exportMutation.isPending}
                  onApprove={handleApprove}
                  onReject={setRejectTarget}
                  onExport={handleExport}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RejectBatchDialog
        rejectTarget={rejectTarget}
        rejectReason={rejectReason}
        isPending={approveMutation.isPending}
        onReasonChange={setRejectReason}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
      />
    </>
  );
}

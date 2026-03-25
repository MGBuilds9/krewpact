'use client';

import { CheckCircle, Clock, FileText, XCircle } from 'lucide-react';
import { useState } from 'react';

import { TimesheetBatchApprovalForm } from '@/components/TimeExpense/TimesheetBatchApprovalForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useDivisionName } from '@/hooks/useDivisionName';
import { useApproveTimesheetBatch, useTimesheetBatches } from '@/hooks/useTimeExpense';
import { formatStatus } from '@/lib/format-status';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  submitted: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  exported: 'secondary',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  submitted: <Clock className="h-3 w-3" />,
};

type Batch = {
  id: string;
  period_start: string;
  period_end: string;
  division_id: string;
  status: string;
};

function StatCards({
  total,
  submitted,
  approved,
}: {
  total: number;
  submitted: number;
  approved: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Total Batches</div>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Pending Approval</div>
          <div className="text-2xl font-bold text-orange-500">{submitted}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground mb-1">Approved</div>
          <div className="text-2xl font-bold text-green-600">{approved}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function BatchCard({
  batch,
  approvalTarget,
  onApprove,
  isPending,
}: {
  batch: Batch;
  approvalTarget: string | null;
  onApprove: (id: string | null) => void;
  isPending: boolean;
}) {
  const approveBatch = useApproveTimesheetBatch();
  const { name: divName, isLoading: divLoading } = useDivisionName(batch.division_id);
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">
              {batch.period_start} — {batch.period_end}
            </p>
            <p className="text-xs text-muted-foreground">
              Division:{' '}
              {divLoading ? <Skeleton className="inline-block h-3 w-24 align-middle" /> : divName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={STATUS_VARIANT[batch.status] || 'outline'} className="gap-1">
            {STATUS_ICON[batch.status]}
            {formatStatus(batch.status)}
          </Badge>
          {batch.status === 'submitted' && (
            <Dialog
              open={approvalTarget === batch.id}
              onOpenChange={(o) => onApprove(o ? batch.id : null)}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Review
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve / Reject Timesheet</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Period: {batch.period_start} to {batch.period_end}
                </p>
                <TimesheetBatchApprovalForm
                  onSubmit={(values) => {
                    approveBatch.mutate(
                      { id: batch.id, ...values },
                      { onSuccess: () => onApprove(null) },
                    );
                  }}
                  isLoading={isPending}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TimesheetsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [approvalTarget, setApprovalTarget] = useState<string | null>(null);
  const { data: res, isLoading } = useTimesheetBatches({ status: statusFilter || undefined });
  const approve = useApproveTimesheetBatch();
  const batches = res ? res.data || [] : [];

  return (
    <>
      <title>Timesheets — KrewPact</title>
      <div className="space-y-6">
        <PageHeader
          title="Timesheets"
          description="Review and approve timesheet batches by pay period"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
          </SelectContent>
        </Select>
        <StatCards
          total={res ? res.total || 0 : 0}
          submitted={batches.filter((b) => b.status === 'submitted').length}
          approved={batches.filter((b) => b.status === 'approved').length}
        />
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {batches.length === 0 && (
              <p className="text-muted-foreground text-sm">No timesheet batches found.</p>
            )}
            {batches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch as Batch}
                approvalTarget={approvalTarget}
                onApprove={setApprovalTarget}
                isPending={approve.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

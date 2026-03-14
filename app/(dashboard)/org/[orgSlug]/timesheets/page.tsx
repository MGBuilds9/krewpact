'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTimesheetBatches, useApproveTimesheetBatch } from '@/hooks/useTimeExpense';
import { TimesheetBatchApprovalForm } from '@/components/TimeExpense/TimesheetBatchApprovalForm';

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

export default function TimesheetsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [approvalTarget, setApprovalTarget] = useState<string | null>(null);

  const { data: res, isLoading } = useTimesheetBatches({
    status: statusFilter || undefined,
  });
  const approve = useApproveTimesheetBatch();

  const batches = res?.data ?? [];

  return (
    <>
      <title>Timesheets — KrewPact</title>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Timesheets</h1>
            <p className="text-muted-foreground text-sm">
              Review and approve timesheet batches by pay period
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Total Batches</div>
              <div className="text-2xl font-bold">{res?.total ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Pending Approval</div>
              <div className="text-2xl font-bold text-orange-500">
                {batches.filter((b) => b.status === 'submitted').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">Approved</div>
              <div className="text-2xl font-bold text-green-600">
                {batches.filter((b) => b.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
        </div>

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
              <Card key={batch.id}>
                <CardContent className="flex items-center justify-between py-4 px-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        {batch.period_start} — {batch.period_end}
                      </p>
                      <p className="text-xs text-muted-foreground">Division: {batch.division_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={STATUS_VARIANT[batch.status] ?? 'outline'}
                      className="gap-1 capitalize"
                    >
                      {STATUS_ICON[batch.status]}
                      {batch.status}
                    </Badge>
                    {batch.status === 'submitted' && (
                      <Dialog
                        open={approvalTarget === batch.id}
                        onOpenChange={(o) => setApprovalTarget(o ? batch.id : null)}
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
                              approve.mutate(
                                { id: batch.id, ...values },
                                { onSuccess: () => setApprovalTarget(null) },
                              );
                            }}
                            isLoading={approve.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

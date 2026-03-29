'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/shared/PageHeader';
import { PayrollPeriodSelector } from '@/components/TimeExpense/PayrollPeriodSelector';
import { TimesheetBatchTable } from '@/components/TimeExpense/TimesheetBatchTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { type PayrollPeriod,useTimesheetBatchList } from '@/hooks/usePayroll';
import { useUserRBAC } from '@/hooks/useRBAC';

const APPROVER_ROLES = ['payroll_admin', 'executive', 'platform_admin'];

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function PayrollPageContent() {
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { hasRole, isAdmin } = useUserRBAC();

  const { data, isLoading } = useTimesheetBatchList({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const canApprove = isAdmin || APPROVER_ROLES.some((r) => hasRole(r));
  const batches = data?.data ?? [];

  const filteredBatches = period
    ? batches.filter(
        (b) => b.period_start === period.start && b.period_end === period.end,
      )
    : batches;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="ADP payroll export and timesheet management"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PayrollPeriodSelector value={period} onChange={setPeriod} />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <TimesheetBatchTable
          batches={filteredBatches}
          isLoading={isLoading}
          canApprove={canApprove}
        />
      )}
    </div>
  );
}

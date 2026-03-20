'use client';

import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, CheckCircle2, ClipboardCheck, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useApproveEnrollment,
  usePendingEnrollments,
  useRejectEnrollment,
} from '@/hooks/crm/usePendingEnrollments';
import { useOrgRouter } from '@/hooks/useOrgRouter';

const TRIGGER_LABELS: Record<string, string> = {
  score_threshold: 'Score Threshold',
  on_lead_created: 'Lead Created',
  manual: 'Manual',
};

export default function EnrollmentApprovalsPage() {
  const { push: orgPush } = useOrgRouter();
  const { data: enrollments, isLoading } = usePendingEnrollments();
  const approveMutation = useApproveEnrollment();
  const rejectMutation = useRejectEnrollment();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enrollment Approvals</h2>
          <p className="text-muted-foreground">
            Review and approve leads before they enter outreach sequences
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {['a', 'b', 'c', 'd', 'e'].map((key) => (
            <Skeleton key={key} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !enrollments?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          No pending enrollments. Leads requiring approval before entering sequences will appear
          here.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => {
                const isBusy =
                  (approveMutation.isPending && approveMutation.variables === enrollment.id) ||
                  (rejectMutation.isPending && rejectMutation.variables === enrollment.id);

                return (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium hover:underline cursor-pointer bg-transparent border-0 p-0"
                        onClick={() => orgPush(`/crm/leads/${enrollment.lead_id}`)}
                      >
                        {enrollment.leads?.company ?? 'Unknown'}
                      </button>
                      {(enrollment.leads?.first_name || enrollment.leads?.last_name) && (
                        <p className="text-sm text-muted-foreground">
                          {[enrollment.leads?.first_name, enrollment.leads?.last_name]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{enrollment.outreach_sequences?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TRIGGER_LABELS[enrollment.trigger_type] ?? enrollment.trigger_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(enrollment.enrolled_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => approveMutation.mutate(enrollment.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() => rejectMutation.mutate(enrollment.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

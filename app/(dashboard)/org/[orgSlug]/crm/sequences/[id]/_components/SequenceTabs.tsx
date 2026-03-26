'use client';

import { UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSequence, useSequenceEnrollments } from '@/hooks/useCRM';
import { useDivisionName } from '@/hooks/useDivisionName';

type SequenceData = NonNullable<ReturnType<typeof useSequence>['data']>;
type EnrollmentItem = NonNullable<ReturnType<typeof useSequenceEnrollments>['data']>[number];

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface EnrollmentsTabProps {
  enrollmentList: EnrollmentItem[];
  orgPush: (path: string) => void;
  onEnrollClick: () => void;
  resolveLeadName: (leadId: string) => string;
}

export function EnrollmentsTab({ enrollmentList, orgPush, onEnrollClick, resolveLeadName }: EnrollmentsTabProps) {
  if (enrollmentList.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground mb-4">No leads enrolled in this sequence yet.</p>
          <Button onClick={onEnrollClick}><UserPlus className="h-4 w-4 mr-2" />Enroll Lead</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Current Step</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead>Next Step</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollmentList.map((enrollment) => (
            <TableRow key={enrollment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => orgPush(`/crm/leads/${enrollment.lead_id}`)}>
              <TableCell className="text-sm">{resolveLeadName(enrollment.lead_id)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">Step {enrollment.current_step}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`border text-xs ${ENROLLMENT_STATUS_COLORS[enrollment.status] ?? ''}`}>
                  {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(enrollment.enrolled_at)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{enrollment.next_step_at ? formatDate(enrollment.next_step_at) : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function DetailsTab({ sequence, stepCount }: { sequence: SequenceData; stepCount: number }) {
  const triggerLabel = sequence.trigger_type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const { name: divisionName } = useDivisionName(sequence.division_id);
  return (
    <Card>
      <CardHeader><CardTitle>Sequence Details</CardTitle></CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="text-sm font-medium text-muted-foreground">Trigger Type</dt><dd className="text-sm">{triggerLabel}</dd></div>
          <div><dt className="text-sm font-medium text-muted-foreground">Division</dt><dd className="text-sm">{divisionName}</dd></div>
          <div><dt className="text-sm font-medium text-muted-foreground">Status</dt><dd className="text-sm">{sequence.is_active ? 'Active' : 'Inactive'}</dd></div>
          <div><dt className="text-sm font-medium text-muted-foreground">Total Steps</dt><dd className="text-sm">{stepCount}</dd></div>
          <div><dt className="text-sm font-medium text-muted-foreground">Created</dt><dd className="text-sm">{formatDate(sequence.created_at)}</dd></div>
          <div><dt className="text-sm font-medium text-muted-foreground">Last Updated</dt><dd className="text-sm">{formatDate(sequence.updated_at)}</dd></div>
          {sequence.trigger_conditions && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">Trigger Conditions</dt>
              <dd className="text-sm font-mono bg-muted rounded p-2 mt-1 text-xs">{JSON.stringify(sequence.trigger_conditions, null, 2)}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

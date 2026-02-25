'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useSequence,
  useUpdateSequence,
  useSequenceEnrollments,
  useEnrollInSequence,
  useDeleteSequenceStep,
  useProcessSequences,
} from '@/hooks/useCRM';
import type { SequenceStep } from '@/hooks/useCRM';
import { SequenceStepEditor } from '@/components/CRM/SequenceStepEditor';
import { SequenceStepForm } from '@/components/CRM/SequenceStepForm';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEnrollmentStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function SequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sequenceId = params.id as string;

  const { data: sequence, isLoading } = useSequence(sequenceId);
  const { data: enrollments } = useSequenceEnrollments(sequenceId);
  const updateSequence = useUpdateSequence();
  const enrollInSequence = useEnrollInSequence();
  const deleteStep = useDeleteSequenceStep();
  const processSequences = useProcessSequences();

  const [addStepOpen, setAddStepOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [enrollLeadOpen, setEnrollLeadOpen] = useState(false);
  const [enrollLeadId, setEnrollLeadId] = useState('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Sequence not found</h2>
        <p className="text-muted-foreground mb-4">
          This sequence may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => router.push('/crm/sequences')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sequences
        </Button>
      </div>
    );
  }

  const steps = sequence.sequence_steps ?? [];
  const nextStepNumber = steps.length + 1;
  const enrollmentList = enrollments ?? [];

  function handleToggleActive(checked: boolean) {
    updateSequence.mutate({ id: sequence!.id, is_active: checked });
  }

  function handleDeleteStep(stepId: string) {
    deleteStep.mutate({ sequenceId, stepId });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/crm/sequences')}
          className="mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{sequence.name}</h1>
            {sequence.is_active ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 border" variant="outline">
                Active
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 border" variant="outline">
                Inactive
              </Badge>
            )}
          </div>
          {sequence.description && (
            <p className="text-muted-foreground mt-1">{sequence.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">
              Active
            </Label>
            <Switch
              id="active-toggle"
              checked={sequence.is_active}
              onCheckedChange={handleToggleActive}
              disabled={updateSequence.isPending}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => processSequences.mutate()}
            disabled={processSequences.isPending}
          >
            {processSequences.isPending ? 'Processing...' : 'Process Now'}
          </Button>
          <Button variant="outline" onClick={() => setEnrollLeadOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Lead
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollmentList.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Steps Tab */}
        <TabsContent value="steps" className="mt-4">
          <SequenceStepEditor
            sequenceId={sequenceId}
            steps={steps}
            onAddStep={() => setAddStepOpen(true)}
            onEditStep={(step) => setEditingStep(step)}
            onDeleteStep={handleDeleteStep}
          />
        </TabsContent>

        {/* Enrollments Tab */}
        <TabsContent value="enrollments" className="mt-4">
          {enrollmentList.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground mb-4">
                  No leads enrolled in this sequence yet.
                </p>
                <Button onClick={() => setEnrollLeadOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Lead
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Next Step</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollmentList.map((enrollment) => (
                    <TableRow
                      key={enrollment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/crm/leads/${enrollment.lead_id}`)}
                    >
                      <TableCell className="font-mono text-sm">{enrollment.lead_id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        Step {enrollment.current_step}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border text-xs ${ENROLLMENT_STATUS_COLORS[enrollment.status] ?? ''}`}
                        >
                          {formatEnrollmentStatus(enrollment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(enrollment.enrolled_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {enrollment.next_step_at ? formatDate(enrollment.next_step_at) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Trigger Type</dt>
                  <dd className="text-sm">
                    {sequence.trigger_type
                      .split('_')
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Division</dt>
                  <dd className="text-sm">{sequence.division_id ?? 'All divisions'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                  <dd className="text-sm">{sequence.is_active ? 'Active' : 'Inactive'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Total Steps</dt>
                  <dd className="text-sm">{steps.length}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                  <dd className="text-sm">{formatDate(sequence.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                  <dd className="text-sm">{formatDate(sequence.updated_at)}</dd>
                </div>
                {sequence.trigger_conditions && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Trigger Conditions</dt>
                    <dd className="text-sm font-mono bg-muted rounded p-2 mt-1 text-xs">
                      {JSON.stringify(sequence.trigger_conditions, null, 2)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Step Dialog */}
      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Step {nextStepNumber}</DialogTitle>
          </DialogHeader>
          <SequenceStepForm
            sequenceId={sequenceId}
            nextStepNumber={nextStepNumber}
            onSuccess={() => setAddStepOpen(false)}
            onCancel={() => setAddStepOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Step Dialog */}
      <Dialog open={!!editingStep} onOpenChange={(open) => { if (!open) setEditingStep(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step {editingStep?.step_number}</DialogTitle>
          </DialogHeader>
          {editingStep && (
            <SequenceStepForm
              sequenceId={sequenceId}
              initialData={editingStep}
              nextStepNumber={editingStep.step_number}
              onSuccess={() => setEditingStep(null)}
              onCancel={() => setEditingStep(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Enroll Lead Dialog */}
      <Dialog open={enrollLeadOpen} onOpenChange={(open) => { if (!open) { setEnrollLeadOpen(false); setEnrollLeadId(''); } else { setEnrollLeadOpen(true); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Lead</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!enrollLeadId.trim()) return;
              enrollInSequence.mutate(
                { sequenceId, lead_id: enrollLeadId.trim() },
                {
                  onSuccess: () => {
                    setEnrollLeadOpen(false);
                    setEnrollLeadId('');
                  },
                },
              );
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="enroll_lead_id">Lead ID</Label>
              <Input
                id="enroll_lead_id"
                placeholder="Enter lead ID to enroll"
                value={enrollLeadId}
                onChange={(e) => setEnrollLeadId(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEnrollLeadOpen(false); setEnrollLeadId(''); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={!enrollLeadId.trim() || enrollInSequence.isPending}>
                Enroll
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

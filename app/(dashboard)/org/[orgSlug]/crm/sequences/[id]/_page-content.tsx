'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { SequenceStep } from '@/hooks/useCRM';
import {
  useDeleteSequenceStep,
  useEnrollInSequence,
  useLeads,
  useProcessSequences,
  useSequence,
  useSequenceEnrollments,
  useUpdateSequence,
} from '@/hooks/useCRM';
import { useOrgRouter } from '@/hooks/useOrgRouter';

import type { SequenceContentProps } from './_components/SequenceContent';
import { SequenceContent } from './_components/SequenceContent';

export default function SequenceDetailPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const sequenceId = params.id as string;
  const { data: sequence, isLoading } = useSequence(sequenceId);
  const { data: enrollments } = useSequenceEnrollments(sequenceId);
  const { data: leadsData } = useLeads({ limit: 500 });
  const updateSequence = useUpdateSequence();
  const enrollInSequence = useEnrollInSequence();
  const deleteStep = useDeleteSequenceStep();
  const processSequences = useProcessSequences();
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<SequenceStep | null>(null);
  const [enrollLeadOpen, setEnrollLeadOpen] = useState(false);
  const [enrollLeadId, setEnrollLeadId] = useState('');

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  if (!sequence)
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Sequence not found</h2>
        <p className="text-muted-foreground mb-4">
          This sequence may have been deleted or you don&apos;t have access.
        </p>
        <Button onClick={() => orgPush('/crm/sequences')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sequences
        </Button>
      </div>
    );

  const leadNameMap = new Map((leadsData?.data ?? []).map((l) => [l.id, l.company_name]));
  const steps = sequence.sequence_steps || [];
  return (
    <SequenceContent
      sequence={sequence}
      sequenceId={sequenceId}
      enrollmentList={enrollments || []}
      steps={steps as SequenceContentProps['steps']}
      addStepOpen={addStepOpen}
      setAddStepOpen={setAddStepOpen}
      editingStep={editingStep}
      setEditingStep={setEditingStep}
      enrollLeadOpen={enrollLeadOpen}
      setEnrollLeadOpen={setEnrollLeadOpen}
      enrollLeadId={enrollLeadId}
      setEnrollLeadId={setEnrollLeadId}
      orgPush={orgPush}
      resolveLeadName={(id) => leadNameMap.get(id) ?? id.slice(0, 8)}
      onUpdateActive={(checked) => updateSequence.mutate({ id: sequence.id, is_active: checked })}
      onProcessNow={() => processSequences.mutate()}
      onDeleteStep={(stepId) => deleteStep.mutate({ sequenceId, stepId })}
      onEnroll={(id) =>
        enrollInSequence.mutate(
          { sequenceId, lead_id: id },
          {
            onSuccess: () => {
              setEnrollLeadOpen(false);
              setEnrollLeadId('');
            },
          },
        )
      }
      updatePending={updateSequence.isPending}
      processPending={processSequences.isPending}
      enrollPending={enrollInSequence.isPending}
    />
  );
}

'use client';

import { SequenceStepForm } from '@/components/CRM/SequenceStepForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SequenceStep } from '@/hooks/useCRM';

import { EnrollLeadDialog } from './SequenceContent';

interface SequenceDialogsProps {
  sequenceId: string;
  steps: Array<{ step_number: number }>;
  addStepOpen: boolean;
  setAddStepOpen: (v: boolean) => void;
  editingStep: SequenceStep | null;
  setEditingStep: (v: SequenceStep | null) => void;
  enrollLeadOpen: boolean;
  setEnrollLeadOpen: (v: boolean) => void;
  enrollLeadId: string;
  setEnrollLeadId: (v: string) => void;
  enrollPending: boolean;
  onEnroll: (leadId: string) => void;
}

export function SequenceDialogs({
  sequenceId,
  steps,
  addStepOpen,
  setAddStepOpen,
  editingStep,
  setEditingStep,
  enrollLeadOpen,
  setEnrollLeadOpen,
  enrollLeadId,
  setEnrollLeadId,
  enrollPending,
  onEnroll,
}: SequenceDialogsProps) {
  const nextStepNumber = steps.length + 1;
  const editingStepNumber = editingStep?.step_number;

  return (
    <>
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
      <Dialog
        open={!!editingStep}
        onOpenChange={(open) => {
          if (!open) setEditingStep(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step {editingStepNumber}</DialogTitle>
          </DialogHeader>
          {editingStepNumber !== undefined && editingStep && (
            <SequenceStepForm
              sequenceId={sequenceId}
              initialData={editingStep}
              nextStepNumber={editingStepNumber}
              onSuccess={() => setEditingStep(null)}
              onCancel={() => setEditingStep(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <EnrollLeadDialog
        open={enrollLeadOpen}
        onOpenChange={setEnrollLeadOpen}
        sequenceId={sequenceId}
        leadId={enrollLeadId}
        setLeadId={setEnrollLeadId}
        isPending={enrollPending}
        onEnroll={onEnroll}
      />
    </>
  );
}

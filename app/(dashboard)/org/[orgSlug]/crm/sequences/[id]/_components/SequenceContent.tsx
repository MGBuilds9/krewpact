'use client';

import { ArrowLeft, UserPlus } from 'lucide-react';

import { SequenceStepEditor } from '@/components/CRM/SequenceStepEditor';
import { SequenceStepForm } from '@/components/CRM/SequenceStepForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SequenceStep } from '@/hooks/useCRM';
import { useSequence, useSequenceEnrollments } from '@/hooks/useCRM';

import { DetailsTab } from './SequenceTabs';
import { EnrollmentsTab } from './SequenceTabs';

type SequenceData = NonNullable<ReturnType<typeof useSequence>['data']>;
type EnrollmentItem = NonNullable<ReturnType<typeof useSequenceEnrollments>['data']>[number];

interface EnrollDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sequenceId: string;
  leadId: string;
  setLeadId: (v: string) => void;
  isPending: boolean;
  onEnroll: (leadId: string) => void;
}
export function EnrollLeadDialog({
  open, onOpenChange, sequenceId: _, leadId, setLeadId, isPending, onEnroll,
}: EnrollDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false); setLeadId(''); } else onOpenChange(true); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enroll Lead</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (leadId.trim()) onEnroll(leadId.trim()); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enroll_lead_id">Lead ID</Label>
            <Input id="enroll_lead_id" placeholder="Enter lead ID to enroll" value={leadId} onChange={(e) => setLeadId(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); setLeadId(''); }}>Cancel</Button>
            <Button type="submit" disabled={!leadId.trim() || isPending}>Enroll</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface SequenceContentProps {
  sequence: SequenceData;
  sequenceId: string;
  enrollmentList: EnrollmentItem[];
  steps: SequenceData['sequence_steps'] & Array<{ step_number: number }>;
  addStepOpen: boolean;
  setAddStepOpen: (v: boolean) => void;
  editingStep: SequenceStep | null;
  setEditingStep: (v: SequenceStep | null) => void;
  enrollLeadOpen: boolean;
  setEnrollLeadOpen: (v: boolean) => void;
  enrollLeadId: string;
  setEnrollLeadId: (v: string) => void;
  orgPush: (path: string) => void;
  resolveLeadName: (id: string) => string;
  onUpdateActive: (checked: boolean) => void;
  onProcessNow: () => void;
  onDeleteStep: (stepId: string) => void;
  onEnroll: (leadId: string) => void;
  updatePending: boolean;
  processPending: boolean;
  enrollPending: boolean;
}

export function SequenceContent({
  sequence, sequenceId, enrollmentList, steps, addStepOpen, setAddStepOpen,
  editingStep, setEditingStep, enrollLeadOpen, setEnrollLeadOpen,
  enrollLeadId, setEnrollLeadId, orgPush, resolveLeadName,
  onUpdateActive, onProcessNow, onDeleteStep, onEnroll,
  updatePending, processPending, enrollPending,
}: SequenceContentProps) {
  const nextStepNumber = steps.length + 1;
  const editingStepNumber = editingStep?.step_number;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => orgPush('/crm/sequences')} className="mt-1" aria-label="Back to sequences">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{sequence.name}</h1>
            <Badge variant="outline" className={`border ${sequence.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {sequence.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          {sequence.description && <p className="text-muted-foreground mt-1">{sequence.description}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">Active</Label>
            <Switch id="active-toggle" checked={sequence.is_active} onCheckedChange={onUpdateActive} disabled={updatePending} />
          </div>
          <Button variant="outline" size="sm" onClick={onProcessNow} disabled={processPending}>
            {processPending ? 'Processing...' : 'Process Now'}
          </Button>
          <Button variant="outline" onClick={() => setEnrollLeadOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />Enroll Lead
          </Button>
        </div>
      </div>
      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments ({enrollmentList.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="steps" className="mt-4">
          <SequenceStepEditor sequenceId={sequenceId} steps={steps} onAddStep={() => setAddStepOpen(true)} onEditStep={(step) => setEditingStep(step)} onDeleteStep={onDeleteStep} />
        </TabsContent>
        <TabsContent value="enrollments" className="mt-4">
          <EnrollmentsTab enrollmentList={enrollmentList} orgPush={orgPush} onEnrollClick={() => setEnrollLeadOpen(true)} resolveLeadName={resolveLeadName} />
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <DetailsTab sequence={sequence} stepCount={steps.length} />
        </TabsContent>
      </Tabs>
      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Step {nextStepNumber}</DialogTitle></DialogHeader>
          <SequenceStepForm sequenceId={sequenceId} nextStepNumber={nextStepNumber} onSuccess={() => setAddStepOpen(false)} onCancel={() => setAddStepOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingStep} onOpenChange={(open) => { if (!open) setEditingStep(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Step {editingStepNumber}</DialogTitle></DialogHeader>
          {editingStepNumber !== undefined && editingStep && (
            <SequenceStepForm sequenceId={sequenceId} initialData={editingStep} nextStepNumber={editingStepNumber} onSuccess={() => setEditingStep(null)} onCancel={() => setEditingStep(null)} />
          )}
        </DialogContent>
      </Dialog>
      <EnrollLeadDialog
        open={enrollLeadOpen} onOpenChange={setEnrollLeadOpen}
        sequenceId={sequenceId} leadId={enrollLeadId} setLeadId={setEnrollLeadId}
        isPending={enrollPending} onEnroll={onEnroll}
      />
    </div>
  );
}

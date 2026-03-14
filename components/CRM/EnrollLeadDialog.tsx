'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useSequences, useEnrollInSequence } from '@/hooks/useCRM';

export interface EnrollLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  contactId?: string;
}

export function EnrollLeadDialog({ open, onOpenChange, leadId, contactId }: EnrollLeadDialogProps) {
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');

  const { data: sequences } = useSequences({ isActive: true });
  const enrollInSequence = useEnrollInSequence();

  const sequenceList = sequences ?? [];

  async function handleSubmit() {
    if (!selectedSequenceId) return;

    await enrollInSequence.mutateAsync(
      {
        sequenceId: selectedSequenceId,
        lead_id: leadId,
        contact_id: contactId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedSequenceId('');
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Sequence</DialogTitle>
          <DialogDescription>
            Select an active sequence to enroll this lead in automated outreach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sequence-select">Sequence *</Label>
            {sequenceList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active sequences available. Create one first.
              </p>
            ) : (
              <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                <SelectTrigger id="sequence-select">
                  <SelectValue placeholder="Select a sequence" />
                </SelectTrigger>
                <SelectContent>
                  {sequenceList.map((seq) => (
                    <SelectItem key={seq.id} value={seq.id}>
                      {seq.name}
                      {seq.description ? ` — ${seq.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSequenceId || enrollInSequence.isPending}
          >
            {enrollInSequence.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

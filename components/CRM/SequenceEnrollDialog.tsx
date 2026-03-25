'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkEnrollInSequence, useSequences } from '@/hooks/useCRM';

export interface SequenceEnrollDialogProps {
  open: boolean;
  onClose: () => void;
  leadIds: string[];
}

export function SequenceEnrollDialog({ open, onClose, leadIds }: SequenceEnrollDialogProps) {
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');

  const { data: sequences } = useSequences({ isActive: true });
  const bulkEnroll = useBulkEnrollInSequence();

  const sequenceList = sequences ?? [];
  const count = leadIds.length;

  async function handleSubmit() {
    if (!selectedSequenceId || count === 0) return;

    await bulkEnroll.mutateAsync(
      { sequenceId: selectedSequenceId, leadIds },
      {
        onSuccess: () => {
          onClose();
          setSelectedSequenceId('');
        },
      },
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      onClose();
      setSelectedSequenceId('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll in Sequence</DialogTitle>
          <DialogDescription>
            Select an active sequence to enroll {count} lead{count !== 1 ? 's' : ''} in automated
            outreach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bulk-sequence-select">Sequence *</Label>
            {sequenceList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active sequences available. Create one first.
              </p>
            ) : (
              <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                <SelectTrigger id="bulk-sequence-select">
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSequenceId || count === 0 || bulkEnroll.isPending}
          >
            {bulkEnroll.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enroll {count} Lead{count !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

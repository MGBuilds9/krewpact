'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { SerialItem } from '@/hooks/useSerials';
import { useReturnSerial } from '@/hooks/useSerials';
import { formatStatus } from '@/lib/format-status';

const CONDITIONS = ['good', 'fair', 'damaged', 'needs_repair'] as const;

interface ReturnDialogProps {
  serial: SerialItem | null;
  onClose: () => void;
}

export function ReturnDialog({ serial, onClose }: ReturnDialogProps) {
  const returnMutation = useReturnSerial();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!serial) return;
    const fd = new FormData(e.currentTarget);
    returnMutation.mutate(
      {
        serialId: serial.id,
        location_id: fd.get('location_id') as string,
        condition: (fd.get('condition') as string) || undefined,
        notes: (fd.get('notes') as string) || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={!!serial} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Serial</DialogTitle>
          <DialogDescription>
            Returning {serial?.serial_number} ({serial?.item_name})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="location_id">Return Location *</Label>
            <Input id="location_id" name="location_id" required placeholder="Location ID" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="condition">Condition</Label>
            <Select name="condition" defaultValue="good">
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatStatus(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="return_notes">Notes</Label>
            <Textarea id="return_notes" name="notes" rows={2} placeholder="Optional notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={returnMutation.isPending}>
              {returnMutation.isPending ? 'Processing...' : 'Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

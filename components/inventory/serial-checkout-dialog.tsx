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
import { Textarea } from '@/components/ui/textarea';
import type { SerialItem } from '@/hooks/useSerials';
import { useCheckoutSerial } from '@/hooks/useSerials';

interface CheckoutDialogProps {
  serial: SerialItem | null;
  onClose: () => void;
}

export function CheckoutDialog({ serial, onClose }: CheckoutDialogProps) {
  const checkout = useCheckoutSerial();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!serial) return;
    const fd = new FormData(e.currentTarget);
    checkout.mutate(
      {
        serialId: serial.id,
        checked_out_to: fd.get('checked_out_to') as string,
        expected_return_date: (fd.get('expected_return_date') as string) || undefined,
        notes: (fd.get('notes') as string) || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog open={!!serial} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkout Serial</DialogTitle>
          <DialogDescription>
            Checking out {serial?.serial_number} ({serial?.item_name})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="checked_out_to">Checked Out To *</Label>
            <Input id="checked_out_to" name="checked_out_to" required placeholder="Name or ID" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expected_return_date">Expected Return Date</Label>
            <Input id="expected_return_date" name="expected_return_date" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Optional notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={checkout.isPending}>
              {checkout.isPending ? 'Processing...' : 'Checkout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

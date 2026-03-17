'use client';

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
import { Textarea } from '@/components/ui/textarea';

interface ConfirmReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: (reason: string) => void;
}

export function ConfirmReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel = 'Reason',
  reasonRequired = false,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: ConfirmReasonDialogProps) {
  const [reason, setReason] = useState('');

  function handleConfirm() {
    onConfirm(reason);
    setReason('');
    onOpenChange(false);
  }

  function handleCancel() {
    setReason('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-reason">
            {reasonLabel}
            {reasonRequired && ' *'}
          </Label>
          <Textarea
            id="confirm-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Enter ${reasonLabel.toLowerCase()}...`}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={reasonRequired && !reason.trim()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

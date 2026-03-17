'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { ActivityForm } from './ActivityForm';

export interface ActivityLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'opportunity' | 'account' | 'contact';
  entityId: string;
}

export function ActivityLogDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
}: ActivityLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>Record a call, meeting, note, or other activity.</DialogDescription>
        </DialogHeader>
        <ActivityForm
          entityType={entityType}
          entityId={entityId}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

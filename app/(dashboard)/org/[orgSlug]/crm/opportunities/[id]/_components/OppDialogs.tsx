'use client';

import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { LostDealDialog } from '@/components/CRM/LostDealDialog';
import { WonDealDialog } from '@/components/CRM/WonDealDialog';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import type { Opportunity } from '@/hooks/useCRM';

interface OppDialogsProps {
  opportunity: Opportunity;
  opportunityId: string;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (v: boolean) => void;
  wonDialogOpen: boolean;
  setWonDialogOpen: (v: boolean) => void;
  lostDialogOpen: boolean;
  setLostDialogOpen: (v: boolean) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (v: boolean) => void;
  onConfirmDelete: () => void;
}

export function OppDialogs({
  opportunity,
  opportunityId,
  activityDialogOpen,
  setActivityDialogOpen,
  wonDialogOpen,
  setWonDialogOpen,
  lostDialogOpen,
  setLostDialogOpen,
  deleteDialogOpen,
  setDeleteDialogOpen,
  onConfirmDelete,
}: OppDialogsProps) {
  return (
    <>
      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        entityType="opportunity"
        entityId={opportunityId}
      />
      <WonDealDialog opportunity={opportunity} open={wonDialogOpen} onOpenChange={setWonDialogOpen} />
      <LostDealDialog
        opportunity={opportunity}
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
      />
      <ConfirmReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Opportunity"
        description={`Permanently delete "${opportunity.opportunity_name}"? This will remove the opportunity and cannot be undone.`}
        reasonLabel="Reason"
        reasonRequired={false}
        confirmLabel="Delete Opportunity"
        destructive={true}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

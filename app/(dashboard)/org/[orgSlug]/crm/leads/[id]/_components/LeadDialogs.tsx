'use client';

import { ActivityLogDialog } from '@/components/CRM/ActivityLogDialog';
import { ConvertLeadDialog } from '@/components/CRM/ConvertLeadDialog';
import { EmailComposeDialog } from '@/components/CRM/EmailComposeDialog';
import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import type { useLead } from '@/hooks/useCRM';

type LeadData = NonNullable<ReturnType<typeof useLead>['data']>;

interface LeadDialogsProps {
  lead: LeadData;
  leadId: string;
  activityDialogOpen: boolean;
  setActivityDialogOpen: (v: boolean) => void;
  convertDialogOpen: boolean;
  setConvertDialogOpen: (v: boolean) => void;
  emailDialogOpen: boolean;
  setEmailDialogOpen: (v: boolean) => void;
  markLostDialogOpen: boolean;
  setMarkLostDialogOpen: (v: boolean) => void;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (v: boolean) => void;
  recipientEmail: string | undefined;
  recipientName: string | undefined;
  onConfirmMarkLost: (reason: string) => void;
  onConfirmDelete: () => void;
}

export function LeadDialogs({
  lead,
  leadId,
  activityDialogOpen,
  setActivityDialogOpen,
  convertDialogOpen,
  setConvertDialogOpen,
  emailDialogOpen,
  setEmailDialogOpen,
  markLostDialogOpen,
  setMarkLostDialogOpen,
  deleteDialogOpen,
  setDeleteDialogOpen,
  recipientEmail,
  recipientName,
  onConfirmMarkLost,
  onConfirmDelete,
}: LeadDialogsProps) {
  return (
    <>
      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        entityType="lead"
        entityId={leadId}
      />
      <ConvertLeadDialog lead={lead} open={convertDialogOpen} onOpenChange={setConvertDialogOpen} />
      <EmailComposeDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        recipientEmail={recipientEmail}
        recipientName={recipientName}
        leadId={leadId}
      />
      <ConfirmReasonDialog
        open={markLostDialogOpen}
        onOpenChange={setMarkLostDialogOpen}
        title="Mark Lead as Lost"
        description="Provide a reason for closing this lead as lost."
        reasonLabel="Reason"
        reasonRequired={true}
        confirmLabel="Mark Lost"
        destructive={true}
        onConfirm={(reason) => {
          if (reason) onConfirmMarkLost(reason);
        }}
      />
      <ConfirmReasonDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Lead"
        description="This will permanently delete this lead. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        reasonRequired={false}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

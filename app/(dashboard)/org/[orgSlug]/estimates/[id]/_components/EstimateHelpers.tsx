'use client';

import dynamic from 'next/dynamic';

import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

const AllowanceForm = dynamic(() =>
  import('@/components/Estimates/AllowanceForm').then((m) => m.AllowanceForm),
);
const AlternateForm = dynamic(() =>
  import('@/components/Estimates/AlternateForm').then((m) => m.AlternateForm),
);
const ProposalGenerationForm = dynamic(() =>
  import('@/components/Estimates/ProposalGenerationForm').then((m) => m.ProposalGenerationForm),
);
const TakeoffUploadDialog = dynamic(() =>
  import('@/components/Estimates/TakeoffUploadDialog').then((m) => m.TakeoffUploadDialog),
);
const TakeoffJobStatusCard = dynamic(() =>
  import('@/components/Estimates/TakeoffJobStatus').then((m) => m.TakeoffJobStatusCard),
);
const TakeoffReviewPanel = dynamic(() =>
  import('@/components/Estimates/TakeoffReviewPanel').then((m) => m.TakeoffReviewPanel),
);
const TakeoffFeedbackSummary = dynamic(() =>
  import('@/components/Estimates/TakeoffFeedbackSummary').then((m) => m.TakeoffFeedbackSummary),
);

export function EstimateLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 animate-pulse" />
      <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
      <Skeleton className="h-48 w-full rounded-xl animate-pulse" />
    </div>
  );
}

export function EstimateNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold mb-2">Estimate not found</h2>
      <p className="text-muted-foreground mb-4">
        This estimate may have been deleted or you don&apos;t have access.
      </p>
      <button onClick={onBack} className="underline text-sm">
        Back to Estimates
      </button>
    </div>
  );
}

interface TakeoffPanelsProps {
  estimateId: string;
  showTakeoff: boolean;
  activeTakeoffJobId: string | null;
  takeoffReviewJobId: string | null;
  completedTakeoffJobId: string | null;
  onJobComplete: (jobId: string) => void;
  onLinesAccepted: (jobId: string) => void;
}

export function TakeoffPanels({
  estimateId,
  showTakeoff,
  activeTakeoffJobId,
  takeoffReviewJobId,
  completedTakeoffJobId,
  onJobComplete,
  onLinesAccepted,
}: TakeoffPanelsProps) {
  if (!showTakeoff) return null;
  return (
    <>
      {activeTakeoffJobId && !takeoffReviewJobId && (
        <TakeoffJobStatusCard
          estimateId={estimateId}
          jobId={activeTakeoffJobId}
          onComplete={() => onJobComplete(activeTakeoffJobId)}
        />
      )}
      {takeoffReviewJobId && (
        <TakeoffReviewPanel
          estimateId={estimateId}
          jobId={takeoffReviewJobId}
          onAccepted={() => onLinesAccepted(takeoffReviewJobId)}
        />
      )}
      {completedTakeoffJobId && (
        <TakeoffFeedbackSummary estimateId={estimateId} jobId={completedTakeoffJobId} />
      )}
    </>
  );
}

interface EstimateDialogsProps {
  estimateId: string;
  allowanceDialogOpen: boolean;
  alternateDialogOpen: boolean;
  proposalDialogOpen: boolean;
  versionDialogOpen: boolean;
  takeoffDialogOpen: boolean;
  showTakeoff: boolean;
  onAllowanceClose: () => void;
  onAlternateClose: () => void;
  onProposalClose: () => void;
  onVersionClose: (open: boolean) => void;
  onTakeoffClose: (open: boolean) => void;
  onVersionConfirm: (reason: string) => void;
  onJobCreated: (jobId: string) => void;
}

export function EstimateDialogs({
  estimateId,
  allowanceDialogOpen,
  alternateDialogOpen,
  proposalDialogOpen,
  versionDialogOpen,
  takeoffDialogOpen,
  showTakeoff,
  onAllowanceClose,
  onAlternateClose,
  onProposalClose,
  onVersionClose,
  onTakeoffClose,
  onVersionConfirm,
  onJobCreated,
}: EstimateDialogsProps) {
  return (
    <>
      <Dialog open={allowanceDialogOpen} onOpenChange={onAllowanceClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Allowance</DialogTitle>
          </DialogHeader>
          <AllowanceForm
            estimateId={estimateId}
            onSuccess={onAllowanceClose}
            onCancel={onAllowanceClose}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={alternateDialogOpen} onOpenChange={onAlternateClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Alternate</DialogTitle>
          </DialogHeader>
          <AlternateForm
            estimateId={estimateId}
            onSuccess={onAlternateClose}
            onCancel={onAlternateClose}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={proposalDialogOpen} onOpenChange={onProposalClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Proposal</DialogTitle>
          </DialogHeader>
          <ProposalGenerationForm
            estimateId={estimateId}
            onSuccess={onProposalClose}
            onCancel={onProposalClose}
          />
        </DialogContent>
      </Dialog>
      <ConfirmReasonDialog
        open={versionDialogOpen}
        onOpenChange={onVersionClose}
        title="Save Version"
        description="Save a snapshot of this estimate. Optionally describe what changed."
        reasonLabel="Reason"
        reasonRequired={false}
        confirmLabel="Save Version"
        onConfirm={onVersionConfirm}
      />
      {showTakeoff && (
        <TakeoffUploadDialog
          estimateId={estimateId}
          open={takeoffDialogOpen}
          onOpenChange={onTakeoffClose}
          onJobCreated={onJobCreated}
        />
      )}
    </>
  );
}

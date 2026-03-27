'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ConfirmReasonDialog } from '@/components/ui/confirm-reason-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddEstimateLine,
  useCreateEstimateVersion,
  useDeleteEstimateLine,
  useEstimate,
  useEstimateLines,
  useEstimateVersions,
  useUpdateEstimate,
  useUpdateEstimateLine,
} from '@/hooks/useEstimates';
import { useEstimateAllowances, useEstimateAlternates } from '@/hooks/useEstimating';
import { useOrgRouter } from '@/hooks/useOrgRouter';
import type { EstimateStatus } from '@/lib/estimating/estimate-status';
import { ALLOWED_STATUS_TRANSITIONS } from '@/lib/estimating/estimate-status';
import { isFeatureEnabled } from '@/lib/feature-flags';

import { EstimateCardsSection } from './_components/EstimateCardsSection';
import { EstimateHeader } from './_components/EstimateHeader';

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

function EstimateLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64 animate-pulse" />
      <Skeleton className="h-24 w-full rounded-xl animate-pulse" />
      <Skeleton className="h-48 w-full rounded-xl animate-pulse" />
    </div>
  );
}

function EstimateNotFound({ onBack }: { onBack: () => void }) {
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

function TakeoffPanels({
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

function EstimateDialogs({
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

export default function EstimateBuilderPage() {
  const params = useParams();
  const { push: orgPush } = useOrgRouter();
  const estimateId = params.id as string;
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [alternateDialogOpen, setAlternateDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [takeoffDialogOpen, setTakeoffDialogOpen] = useState(false);
  const [activeTakeoffJobId, setActiveTakeoffJobId] = useState<string | null>(null);
  const [takeoffReviewJobId, setTakeoffReviewJobId] = useState<string | null>(null);
  const [completedTakeoffJobId, setCompletedTakeoffJobId] = useState<string | null>(null);
  const showTakeoff = isFeatureEnabled('ai_takeoff');

  const { data: estimate, isLoading } = useEstimate(estimateId);
  const { data: lines } = useEstimateLines(estimateId);
  const { data: versions } = useEstimateVersions(estimateId);
  const { data: allowancesData } = useEstimateAllowances(estimateId);
  const { data: alternatesData } = useEstimateAlternates(estimateId);
  const updateEstimate = useUpdateEstimate();
  const addLine = useAddEstimateLine();
  const updateLine = useUpdateEstimateLine();
  const deleteLine = useDeleteEstimateLine();
  const createVersion = useCreateEstimateVersion();

  if (isLoading) return <EstimateLoadingSkeleton />;
  if (!estimate) return <EstimateNotFound onBack={() => orgPush('/estimates')} />;

  const currentStatus = estimate.status as EstimateStatus;
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  const isEditable = currentStatus === 'draft' || currentStatus === 'review';
  const safeLines = lines || [];

  return (
    <div className="space-y-6">
      <EstimateHeader
        estimate={estimate}
        lines={safeLines}
        allowedTransitions={allowedTransitions}
        isPending={updateEstimate.isPending}
        isVersionPending={createVersion.isPending}
        onTransition={(s) => updateEstimate.mutate({ id: estimateId, status: s })}
        onSaveVersion={() => setVersionDialogOpen(true)}
        onProposal={() => setProposalDialogOpen(true)}
        onTakeoff={showTakeoff && isEditable ? () => setTakeoffDialogOpen(true) : undefined}
        onBack={() => orgPush('/estimates')}
      />
      <TakeoffPanels
        estimateId={estimateId}
        showTakeoff={showTakeoff}
        activeTakeoffJobId={activeTakeoffJobId}
        takeoffReviewJobId={takeoffReviewJobId}
        completedTakeoffJobId={completedTakeoffJobId}
        onJobComplete={(id) => {
          setTakeoffReviewJobId(id);
          setActiveTakeoffJobId(null);
        }}
        onLinesAccepted={(id) => {
          setCompletedTakeoffJobId(id);
          setTakeoffReviewJobId(null);
        }}
      />
      <EstimateCardsSection
        estimate={estimate}
        safeLines={safeLines}
        allowances={allowancesData || []}
        alternates={alternatesData || []}
        isEditable={isEditable}
        versions={versions}
        onAddLine={() =>
          addLine.mutate({
            estimateId,
            description: 'New line item',
            quantity: 1,
            unit_cost: 0,
            markup_pct: 0,
            sort_order: safeLines.length + 1,
          })
        }
        onUpdateLine={(lineId, field, value) =>
          updateLine.mutate({ estimateId, lineId, [field]: value })
        }
        onDeleteLine={(lineId) => deleteLine.mutate({ estimateId, lineId })}
        onAddAllowance={() => setAllowanceDialogOpen(true)}
        onAddAlternate={() => setAlternateDialogOpen(true)}
      />
      <EstimateDialogs
        estimateId={estimateId}
        allowanceDialogOpen={allowanceDialogOpen}
        alternateDialogOpen={alternateDialogOpen}
        proposalDialogOpen={proposalDialogOpen}
        versionDialogOpen={versionDialogOpen}
        takeoffDialogOpen={takeoffDialogOpen}
        showTakeoff={showTakeoff}
        onAllowanceClose={() => setAllowanceDialogOpen(false)}
        onAlternateClose={() => setAlternateDialogOpen(false)}
        onProposalClose={() => setProposalDialogOpen(false)}
        onVersionClose={setVersionDialogOpen}
        onTakeoffClose={setTakeoffDialogOpen}
        onVersionConfirm={(reason) =>
          createVersion.mutate({ estimateId, reason: reason || undefined })
        }
        onJobCreated={(jobId) => setActiveTakeoffJobId(jobId)}
      />
    </div>
  );
}

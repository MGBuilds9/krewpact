'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

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

import { EstimateCardsSection } from './_components/EstimateCardsSection';
import { EstimateHeader } from './_components/EstimateHeader';
import {
  EstimateDialogs,
  EstimateLoadingSkeleton,
  EstimateNotFound,
  TakeoffPanels,
} from './_components/EstimateHelpers';

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
  const showTakeoff = true;

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

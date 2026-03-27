'use client';

import { useCallback, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTakeoffDraftLines } from '@/hooks/useTakeoff';

import { BulkActionsBar, type ReviewLineState, ReviewTable } from './TakeoffReviewTable';

interface TakeoffReviewPanelProps {
  estimateId: string;
  jobId: string;
  onAccepted: () => void;
}

interface SubmitAcceptArgs {
  estimateId: string;
  jobId: string;
  lines: ReviewLineState[];
  onAccepted: () => void;
  setIsSubmitting: (v: boolean) => void;
}

async function submitAcceptedLines({
  estimateId,
  jobId,
  lines,
  onAccepted,
  setIsSubmitting,
}: SubmitAcceptArgs) {
  const acceptedLines = lines
    .filter((l) => l.reviewStatus === 'accepted')
    .map((l) => ({
      draft_line_id: l.id,
      description: l.editedDescription ?? l.description,
      quantity: l.editedQuantity ?? l.quantity,
      unit: l.editedUnit ?? l.unit,
      unit_cost: l.editedUnitCost ?? l.unit_cost ?? 0,
      markup_pct: 0,
    }));

  setIsSubmitting(true);
  try {
    const res = await fetch(`/api/estimates/${estimateId}/takeoff/${jobId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: acceptedLines }),
    });
    if (!res.ok) throw new Error(`Accept failed: ${res.status}`);
    onAccepted();
  } finally {
    setIsSubmitting(false);
  }
}

export function TakeoffReviewPanel({ estimateId, jobId, onAccepted }: TakeoffReviewPanelProps) {
  const { data: draftLines, isLoading } = useTakeoffDraftLines(estimateId, jobId);
  const [overrides, setOverrides] = useState<Map<string, Partial<ReviewLineState>>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lineStates = useMemo<Map<string, ReviewLineState>>(() => {
    if (!draftLines?.length) return new Map();
    return new Map(
      draftLines.map((l) => [
        l.id,
        { ...l, reviewStatus: 'pending', isEditing: false, ...(overrides.get(l.id) ?? {}) },
      ]),
    );
  }, [draftLines, overrides]);

  const updateLine = useCallback((id: string, patch: Partial<ReviewLineState>) => {
    setOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...patch });
      return next;
    });
  }, []);

  const lines = useMemo(() => Array.from(lineStates.values()), [lineStates]);
  const accepted = lines.filter((l) => l.reviewStatus === 'accepted').length;
  const rejected = lines.filter((l) => l.reviewStatus === 'rejected').length;
  const pending = lines.filter((l) => l.reviewStatus === 'pending').length;

  function bulkSet(
    filter: (l: ReviewLineState) => boolean,
    status: ReviewLineState['reviewStatus'],
  ) {
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const [id, line] of lineStates) {
        if (filter(line)) next.set(id, { ...(prev.get(id) ?? {}), reviewStatus: status });
      }
      return next;
    });
  }

  function handleAccept() {
    void submitAcceptedLines({ estimateId, jobId, lines, onAccepted, setIsSubmitting });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Loading draft lines...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Review Takeoff Lines</CardTitle>
          <BulkActionsBar
            onAcceptAll={() => bulkSet((l) => l.reviewStatus === 'pending', 'accepted')}
            onAcceptHighConfidence={() =>
              bulkSet((l) => l.reviewStatus === 'pending' && l.confidence > 0.8, 'accepted')
            }
            onRejectRemaining={() => bulkSet((l) => l.reviewStatus === 'pending', 'rejected')}
          />
        </div>
      </CardHeader>
      <ReviewTable
        lines={lines}
        accepted={accepted}
        rejected={rejected}
        pending={pending}
        isSubmitting={isSubmitting}
        onUpdate={updateLine}
        onAccept={handleAccept}
      />
    </Card>
  );
}

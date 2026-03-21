'use client';

import { Check, Pencil, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { TakeoffDraftLine } from '@/hooks/useTakeoff';
import { useTakeoffDraftLines } from '@/hooks/useTakeoff';

interface TakeoffReviewPanelProps {
  estimateId: string;
  jobId: string;
  onAccepted: () => void;
}

interface ReviewLineState extends TakeoffDraftLine {
  editedDescription?: string;
  editedQuantity?: number;
  editedUnitCost?: number;
  editedUnit?: string;
  reviewStatus: 'pending' | 'accepted' | 'rejected';
  isEditing: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = `${Math.round(confidence * 100)}%`;
  if (confidence > 0.8)
    return <Badge className="bg-green-50 text-green-700 border-green-200">{pct}</Badge>;
  if (confidence > 0.5)
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200">{pct}</Badge>;
  return <Badge className="bg-red-50 text-red-700 border-red-200">{pct}</Badge>;
}

function EditRow({
  line,
  onSave,
}: {
  line: ReviewLineState;
  onSave: (vals: Partial<ReviewLineState>) => void;
}) {
  const [desc, setDesc] = useState(line.editedDescription ?? line.description);
  const [qty, setQty] = useState(String(line.editedQuantity ?? line.quantity));
  const [unit, setUnit] = useState(line.editedUnit ?? line.unit);
  const [cost, setCost] = useState(String(line.editedUnitCost ?? line.unit_cost ?? ''));

  return (
    <td colSpan={7} className="px-3 py-2">
      <div className="flex gap-2 flex-wrap">
        <Input
          className="w-48"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description"
        />
        <Input
          className="w-20"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="Qty"
        />
        <Input
          className="w-20"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
        />
        <Input
          className="w-24"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Unit cost"
        />
        <Button
          size="sm"
          onClick={() =>
            onSave({
              editedDescription: desc,
              editedQuantity: Number(qty),
              editedUnit: unit,
              editedUnitCost: Number(cost),
              isEditing: false,
            })
          }
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onSave({ isEditing: false })}>
          Cancel
        </Button>
      </div>
    </td>
  );
}

export function TakeoffReviewPanel({ estimateId, jobId, onAccepted }: TakeoffReviewPanelProps) {
  const { data: draftLines, isLoading } = useTakeoffDraftLines(estimateId, jobId);
  const [lineStates, setLineStates] = useState<Map<string, ReviewLineState>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!draftLines?.length) return;
    setLineStates(
      new Map(draftLines.map((l) => [l.id, { ...l, reviewStatus: 'pending', isEditing: false }])),
    );
  }, [draftLines]);

  const updateLine = useCallback((id: string, patch: Partial<ReviewLineState>) => {
    setLineStates((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) next.set(id, { ...existing, ...patch });
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
    setLineStates((prev) => {
      const next = new Map(prev);
      for (const [id, line] of next) {
        if (filter(line)) next.set(id, { ...line, reviewStatus: status });
      }
      return next;
    });
  }

  async function handleAccept() {
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
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkSet((l) => l.reviewStatus === 'pending', 'accepted')}
            >
              Accept All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                bulkSet((l) => l.reviewStatus === 'pending' && l.confidence > 0.8, 'accepted')
              }
            >
              Accept High Confidence
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkSet((l) => l.reviewStatus === 'pending', 'rejected')}
            >
              Reject Remaining
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Trade</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-left font-medium">Unit</th>
                <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                <th className="px-3 py-2 text-center font-medium">Confidence</th>
                <th className="px-3 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <>
                  <tr
                    key={line.id}
                    className={`border-b transition-colors ${
                      line.reviewStatus === 'accepted'
                        ? 'bg-green-50/50'
                        : line.reviewStatus === 'rejected'
                          ? 'bg-red-50/50 opacity-60'
                          : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{line.trade}</td>
                    <td className="px-3 py-2">{line.editedDescription ?? line.description}</td>
                    <td className="px-3 py-2 text-right">{line.editedQuantity ?? line.quantity}</td>
                    <td className="px-3 py-2">{line.editedUnit ?? line.unit}</td>
                    <td className="px-3 py-2 text-right">
                      {(line.editedUnitCost ?? line.unit_cost) != null
                        ? `$${(line.editedUnitCost ?? line.unit_cost!).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ConfidenceBadge confidence={line.confidence} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-green-600 hover:text-green-700"
                          onClick={() => updateLine(line.id, { reviewStatus: 'accepted' })}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => updateLine(line.id, { isEditing: !line.isEditing })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => updateLine(line.id, { reviewStatus: 'rejected' })}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {line.isEditing && (
                    <tr key={`${line.id}-edit`} className="border-b bg-muted/20">
                      <EditRow line={line} onSave={(vals) => updateLine(line.id, vals)} />
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {accepted} accepted &middot; {rejected} rejected &middot; {pending} pending
          </span>
          <Button onClick={handleAccept} disabled={accepted === 0 || isSubmitting}>
            {isSubmitting ? 'Accepting...' : `Accept ${accepted} Line${accepted !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

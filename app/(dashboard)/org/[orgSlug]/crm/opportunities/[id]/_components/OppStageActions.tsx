'use client';

import { ArrowRight, Trophy, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface OppStageActionsProps {
  nextRegularStage: string | undefined;
  nextStageLabel: string;
  canMarkWon: boolean;
  canMarkLost: boolean;
  isPending: boolean;
  onNext: (stage: string) => void;
  onWon: () => void;
  onLost: () => void;
}

export function OppStageActions({
  nextRegularStage,
  nextStageLabel,
  canMarkWon,
  canMarkLost,
  isPending,
  onNext,
  onWon,
  onLost,
}: OppStageActionsProps) {
  return (
    <div className="flex gap-2 mt-4 justify-end">
      {nextRegularStage && (
        <Button size="sm" onClick={() => onNext(nextRegularStage)} disabled={isPending}>
          <ArrowRight className="h-4 w-4 mr-1" />
          {nextStageLabel}
        </Button>
      )}
      {canMarkWon && (
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onWon}>
          <Trophy className="h-4 w-4 mr-1" />
          Mark Won
        </Button>
      )}
      {canMarkLost && (
        <Button size="sm" variant="destructive" onClick={onLost} disabled={isPending}>
          <XCircle className="h-4 w-4 mr-1" />
          Mark Lost
        </Button>
      )}
    </div>
  );
}

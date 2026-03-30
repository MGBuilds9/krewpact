'use client';

import { ArrowRight, XCircle, Zap } from 'lucide-react';

import { type StageHistoryEntry,StageProgressBar } from '@/components/CRM/StageProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { LeadStage } from '@/lib/crm/lead-stages';

interface LeadStageCardProps {
  currentStage: LeadStage;
  nextRegularStage: string | undefined;
  canMarkLost: boolean;
  isPending: boolean;
  stageHistory?: StageHistoryEntry[];
  onNext: () => void;
  onLost: () => void;
  onConvert: () => void;
}

export function LeadStageCard({
  currentStage,
  nextRegularStage,
  canMarkLost,
  isPending,
  stageHistory,
  onNext,
  onLost,
  onConvert,
}: LeadStageCardProps) {
  const nextLabel = nextRegularStage
    ? nextRegularStage
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';
  return (
    <Card>
      <CardContent className="pt-6">
        <StageProgressBar currentStage={currentStage} stageHistory={stageHistory} />
        <div className="flex gap-2 mt-4 justify-end">
          {nextRegularStage && (
            <Button size="sm" onClick={onNext} disabled={isPending}>
              <ArrowRight className="h-4 w-4 mr-1" />
              {nextLabel}
            </Button>
          )}
          {canMarkLost && (
            <Button size="sm" variant="destructive" onClick={onLost} disabled={isPending}>
              <XCircle className="h-4 w-4 mr-1" />
              Mark Lost
            </Button>
          )}
          {currentStage === 'won' && (
            <Button size="sm" onClick={onConvert}>
              <Zap className="h-4 w-4 mr-1" />
              Convert to Opportunity
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

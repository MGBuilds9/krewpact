'use client';

import { cn } from '@/lib/utils';
import type { OpportunityStage } from '@/lib/crm/opportunity-stages';

const PIPELINE_STAGES: { key: OpportunityStage; label: string }[] = [
  { key: 'intake', label: 'Intake' },
  { key: 'site_visit', label: 'Site Visit' },
  { key: 'estimating', label: 'Estimating' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'contracted', label: 'Contracted' },
];

const STAGE_ORDER: OpportunityStage[] = [
  'intake',
  'site_visit',
  'estimating',
  'proposal',
  'negotiation',
  'contracted',
];

function getStageIndex(stage: OpportunityStage): number {
  if (stage === 'closed_lost') return -1;
  return STAGE_ORDER.indexOf(stage);
}

interface OpportunityStageProgressBarProps {
  currentStage: OpportunityStage;
}

export function OpportunityStageProgressBar({ currentStage }: OpportunityStageProgressBarProps) {
  const currentIndex = getStageIndex(currentStage);
  const isLost = currentStage === 'closed_lost';

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((stage, index) => {
          const isCompleted = !isLost && currentIndex > index;
          const isCurrent = currentStage === stage.key;

          return (
            <div
              key={stage.key}
              className="flex-1 text-center"
              aria-current={isCurrent ? 'step' : undefined}
              data-completed={isCompleted ? 'true' : undefined}
            >
              <div
                className={cn(
                  'h-2 rounded-full mb-1.5 transition-colors',
                  isCurrent && 'bg-primary',
                  isCompleted && 'bg-primary/60',
                  !isCurrent && !isCompleted && 'bg-muted',
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-muted-foreground',
                  !isCurrent && !isCompleted && 'text-muted-foreground/50',
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {isLost && (
        <div className="mt-2 text-center" aria-current="step" data-lost="true">
          <div className="h-2 rounded-full bg-destructive mb-1.5" />
          <span className="text-xs font-medium text-destructive">Closed Lost</span>
        </div>
      )}
    </div>
  );
}

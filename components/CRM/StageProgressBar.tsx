'use client';

import { cn } from '@/lib/utils';
import type { LeadStage } from '@/lib/crm/lead-stages';

const PIPELINE_STAGES: { key: LeadStage; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
];

const STAGE_ORDER: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];

function getStageIndex(stage: LeadStage): number {
  if (stage === 'lost') return -1;
  return STAGE_ORDER.indexOf(stage);
}

interface StageProgressBarProps {
  currentStage: LeadStage;
}

export function StageProgressBar({ currentStage }: StageProgressBarProps) {
  const currentIndex = getStageIndex(currentStage);
  const isLost = currentStage === 'lost';

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
          <span className="text-xs font-medium text-destructive">Lost</span>
        </div>
      )}
    </div>
  );
}

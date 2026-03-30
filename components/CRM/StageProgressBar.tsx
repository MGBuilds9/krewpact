'use client';

import { LEAD_PIPELINE_ORDER, LEAD_PIPELINE_STAGES } from '@/lib/crm/lead-stages';
import type { LeadStage } from '@/lib/crm/lead-stages';
import { cn } from '@/lib/utils';

function getStageIndex(stage: LeadStage): number {
  if (stage === 'lost') return -1;
  return LEAD_PIPELINE_ORDER.indexOf(stage);
}

export interface StageHistoryEntry {
  from_stage: string | null;
  to_stage: string;
}

interface StageProgressBarProps {
  currentStage: LeadStage;
  stageHistory?: StageHistoryEntry[];
}

/**
 * Build a set of stages the lead has actually visited,
 * based on the stage_history audit trail.
 */
function getVisitedStages(
  currentStage: LeadStage,
  history?: StageHistoryEntry[],
): Set<string> {
  const visited = new Set<string>();
  visited.add(currentStage);
  visited.add('new');

  if (history) {
    for (const entry of history) {
      visited.add(entry.to_stage);
      if (entry.from_stage) visited.add(entry.from_stage);
    }
  }

  return visited;
}

type StageState = 'current' | 'completed' | 'skipped' | 'future';

function resolveStageState(
  stageKey: LeadStage,
  index: number,
  currentStage: LeadStage,
  currentIndex: number,
  visited: Set<string>,
): StageState {
  if (currentStage === stageKey) return 'current';
  if (currentStage === 'lost' || currentIndex <= index) return 'future';
  return visited.has(stageKey) ? 'completed' : 'skipped';
}

const BAR_STYLES: Record<StageState, string> = {
  current: 'bg-primary',
  completed: 'bg-primary/60',
  skipped: 'bg-muted border border-dashed border-muted-foreground/30',
  future: 'bg-muted',
};

const LABEL_STYLES: Record<StageState, string> = {
  current: 'text-primary',
  completed: 'text-muted-foreground',
  skipped: 'text-muted-foreground/40',
  future: 'text-muted-foreground/50',
};

export function StageProgressBar({ currentStage, stageHistory }: StageProgressBarProps) {
  const currentIndex = getStageIndex(currentStage);
  const visited = getVisitedStages(currentStage, stageHistory);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1">
        {LEAD_PIPELINE_STAGES.map((stage, index) => {
          const state = resolveStageState(stage.key, index, currentStage, currentIndex, visited);
          return (
            <div
              key={stage.key}
              className="flex-1 text-center"
              aria-current={state === 'current' ? 'step' : undefined}
              data-completed={state === 'completed' ? 'true' : undefined}
              data-skipped={state === 'skipped' ? 'true' : undefined}
            >
              <div className={cn('h-2 rounded-full mb-1.5 transition-colors', BAR_STYLES[state])} />
              <span className={cn('text-xs font-medium', LABEL_STYLES[state])}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {currentStage === 'lost' && (
        <div className="mt-2 text-center" aria-current="step" data-lost="true">
          <div className="h-2 rounded-full bg-destructive mb-1.5" />
          <span className="text-xs font-medium text-destructive">Lost</span>
        </div>
      )}
    </div>
  );
}

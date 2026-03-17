'use client';

import { GitBranch, X } from 'lucide-react';

import { FlowStep } from './types';

const conditionLabels: Record<string, string> = {
  if_score: 'Score Check',
  if_email_opened: 'Email Opened?',
  if_replied: 'Replied?',
  if_tag: 'Has Tag?',
  if_stage: 'At Stage?',
};

interface ConditionNodeProps {
  step: FlowStep;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConditionNode({ step, selected, onSelect, onDelete }: ConditionNodeProps) {
  const condLabel = step.condition_type
    ? (conditionLabels[step.condition_type] ?? step.condition_type)
    : 'Set condition';

  return (
    <div className="flex flex-col items-center">
      <div
        className={`group relative w-full cursor-pointer rounded-lg border-2 border-dashed bg-background px-4 py-3 shadow-sm transition-colors hover:border-primary/70 ${
          selected ? 'border-primary ring-1 ring-primary' : 'border-amber-400/60'
        }`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-900/20">
            <GitBranch className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-none text-amber-700 dark:text-amber-400">
              Condition
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{condLabel}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute right-2 top-2 hidden rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
            aria-label="Delete condition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Branch labels */}
        <div className="mt-3 flex justify-between text-xs font-medium">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Yes →
          </span>
          <span className="flex items-center gap-1 text-red-500">
            No →
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          </span>
        </div>
      </div>
    </div>
  );
}

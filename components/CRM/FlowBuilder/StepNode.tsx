'use client';

import { CheckSquare, Clock, GitBranch, Mail, X } from 'lucide-react';

import { FlowStep } from './types';

const iconMap = {
  email: Mail,
  task: CheckSquare,
  wait: Clock,
  condition: GitBranch,
};

const labelMap = {
  email: 'Send Email',
  task: 'Create Task',
  wait: 'Wait',
  condition: 'Condition',
};

function getConfigSummary(step: FlowStep): string {
  const cfg = step.action_config;
  if (step.action_type === 'email') {
    return (cfg.subject as string) || (cfg.template_id as string) || 'No template set';
  }
  if (step.action_type === 'task') {
    return (cfg.title as string) || 'No title set';
  }
  if (step.action_type === 'wait') {
    const days = step.delay_days ?? 0;
    const hours = step.delay_hours ?? 0;
    if (days && hours) return `${days}d ${hours}h`;
    if (days) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return 'No delay set';
  }
  return '';
}

interface StepNodeProps {
  step: FlowStep;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function StepNode({ step, selected, onSelect, onDelete }: StepNodeProps) {
  const Icon = iconMap[step.action_type] ?? Mail;
  const summary = getConfigSummary(step);

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm cursor-pointer transition-colors hover:border-primary/50 ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-border'
      }`}
      onClick={onSelect}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-none">{labelMap[step.action_type]}</p>
        {summary && <p className="mt-1 truncate text-xs text-muted-foreground">{summary}</p>}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-2 top-2 hidden rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
        aria-label="Delete step"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, CheckSquare, Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import type { SequenceStep } from '@/hooks/useCRM';

const ACTION_TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  task: CheckSquare,
  wait: Clock,
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  email: 'Send Email',
  task: 'Create Task',
  wait: 'Wait',
};

function formatDelay(days: number, hours: number): string {
  if (days === 0 && hours === 0) return 'Immediately';
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

function getActionSummary(step: SequenceStep): string {
  const config = step.action_config ?? {};
  if (step.action_type === 'email') {
    return (config.subject as string) ?? 'No subject configured';
  }
  if (step.action_type === 'task') {
    return (config.title as string) ?? 'No title configured';
  }
  return 'Wait for delay period';
}

export interface SequenceStepEditorProps {
  sequenceId: string;
  steps: SequenceStep[];
  onAddStep: () => void;
  onEditStep: (step: SequenceStep) => void;
  onDeleteStep: (stepId: string) => void;
}

export function SequenceStepEditor({
  steps,
  onAddStep,
  onEditStep,
  onDeleteStep,
}: SequenceStepEditorProps) {
  const sortedSteps = steps.slice().sort((a, b) => a.step_number - b.step_number);

  if (steps.length === 0) {
    return (
      <div className="text-center py-10">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          No steps yet. Add your first step to define what this sequence does.
        </p>
        <Button onClick={onAddStep}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Step
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedSteps.map((step, index) => {
        const Icon = ACTION_TYPE_ICONS[step.action_type] ?? Clock;
        const label = ACTION_TYPE_LABELS[step.action_type] ?? step.action_type;
        const summary = getActionSummary(step);

        return (
          <div key={step.id}>
            {/* Connector line */}
            {index > 0 && (
              <div className="flex justify-center py-1">
                <div className="h-4 w-px bg-border" />
              </div>
            )}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {step.step_number}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    </div>
                    <p className="text-sm mt-0.5 truncate">{summary}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Delay: {formatDelay(step.delay_days, step.delay_hours)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEditStep(step)}
                      aria-label={`Edit step ${step.step_number}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDeleteStep(step.id)}
                      aria-label={`Delete step ${step.step_number}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}

      <div className="flex justify-center py-1">
        <div className="h-4 w-px bg-border" />
      </div>
      <div className="flex justify-center">
        <Button variant="outline" onClick={onAddStep}>
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>
    </div>
  );
}

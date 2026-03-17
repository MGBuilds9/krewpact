'use client';

import { CheckSquare, Clock, GitBranch, Loader2, Mail, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface FlowToolbarProps {
  onAddStep: (type: 'email' | 'task' | 'wait' | 'condition') => void;
  onSave: () => void;
  saving?: boolean;
}

export function FlowToolbar({ onAddStep, onSave, saving }: FlowToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2">
      <span className="mr-1 text-xs font-medium text-muted-foreground">Add:</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onAddStep('email')}
      >
        <Mail className="h-3.5 w-3.5" />
        Email
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onAddStep('task')}
      >
        <CheckSquare className="h-3.5 w-3.5" />
        Task
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onAddStep('wait')}
      >
        <Clock className="h-3.5 w-3.5" />
        Wait
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => onAddStep('condition')}
      >
        <GitBranch className="h-3.5 w-3.5" />
        Condition
      </Button>

      <div className="ml-auto">
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

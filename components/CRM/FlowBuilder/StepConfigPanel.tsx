'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FlowStep } from './types';

interface StepConfigPanelProps {
  step: FlowStep | null;
  onUpdate: (changes: Partial<FlowStep>) => void;
  onClose: () => void;
}

function getConfig<T>(step: FlowStep, key: string): T | undefined {
  return step.action_config[key] as T | undefined;
}

function getConditionConfig<T>(step: FlowStep, key: string): T | undefined {
  return (step.condition_config ?? {})[key] as T | undefined;
}

export function StepConfigPanel({ step, onUpdate, onClose }: StepConfigPanelProps) {
  if (!step) return null;

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ action_config: { ...step.action_config, [key]: value } });
  };

  const updateConditionConfig = (key: string, value: unknown) => {
    onUpdate({ condition_config: { ...(step.condition_config ?? {}), [key]: value } });
  };

  return (
    <div className="flex h-full w-full sm:w-72 shrink-0 flex-col rounded-lg border bg-background shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold capitalize">Configure {step.action_type}</p>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {step.action_type === 'email' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="template_id">Template ID</Label>
              <Input
                id="template_id"
                placeholder="template-uuid"
                value={getConfig<string>(step, 'template_id') ?? ''}
                onChange={(e) => updateConfig('template_id', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject Override</Label>
              <Input
                id="subject"
                placeholder="Leave blank to use template subject"
                value={getConfig<string>(step, 'subject') ?? ''}
                onChange={(e) => updateConfig('subject', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body Override</Label>
              <Textarea
                id="body"
                placeholder="Leave blank to use template body"
                rows={4}
                value={getConfig<string>(step, 'body') ?? ''}
                onChange={(e) => updateConfig('body', e.target.value)}
              />
            </div>
          </>
        )}

        {step.action_type === 'task' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="task_title">Title</Label>
              <Input
                id="task_title"
                placeholder="Follow up with lead"
                value={getConfig<string>(step, 'title') ?? ''}
                onChange={(e) => updateConfig('title', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task_desc">Description</Label>
              <Textarea
                id="task_desc"
                placeholder="Task description..."
                rows={3}
                value={getConfig<string>(step, 'description') ?? ''}
                onChange={(e) => updateConfig('description', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign_to">Assign To (user ID)</Label>
              <Input
                id="assign_to"
                placeholder="user-uuid"
                value={getConfig<string>(step, 'assign_to') ?? ''}
                onChange={(e) => updateConfig('assign_to', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_in_days">Due In (days)</Label>
              <Input
                id="due_in_days"
                type="number"
                min={0}
                placeholder="3"
                value={getConfig<number>(step, 'due_in_days') ?? ''}
                onChange={(e) => updateConfig('due_in_days', Number(e.target.value))}
              />
            </div>
          </>
        )}

        {step.action_type === 'wait' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="delay_days">Delay Days</Label>
              <Input
                id="delay_days"
                type="number"
                min={0}
                placeholder="0"
                value={step.delay_days ?? ''}
                onChange={(e) => onUpdate({ delay_days: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delay_hours">Delay Hours</Label>
              <Input
                id="delay_hours"
                type="number"
                min={0}
                max={23}
                placeholder="0"
                value={step.delay_hours ?? ''}
                onChange={(e) => onUpdate({ delay_hours: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {step.action_type === 'condition' && (
          <>
            <div className="space-y-1.5">
              <Label>Condition Type</Label>
              <Select
                value={step.condition_type ?? ''}
                onValueChange={(val) => onUpdate({ condition_type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="if_score">Score Check</SelectItem>
                  <SelectItem value="if_email_opened">Email Opened?</SelectItem>
                  <SelectItem value="if_replied">Replied?</SelectItem>
                  <SelectItem value="if_tag">Has Tag?</SelectItem>
                  <SelectItem value="if_stage">At Stage?</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {step.condition_type === 'if_score' && (
              <div className="space-y-1.5">
                <Label htmlFor="min_score">Minimum Score</Label>
                <Input
                  id="min_score"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="50"
                  value={getConditionConfig<number>(step, 'min_score') ?? ''}
                  onChange={(e) => updateConditionConfig('min_score', Number(e.target.value))}
                />
              </div>
            )}

            {step.condition_type === 'if_tag' && (
              <div className="space-y-1.5">
                <Label htmlFor="tag_id">Tag ID</Label>
                <Input
                  id="tag_id"
                  placeholder="tag-uuid"
                  value={getConditionConfig<string>(step, 'tag_id') ?? ''}
                  onChange={(e) => updateConditionConfig('tag_id', e.target.value)}
                />
              </div>
            )}

            {step.condition_type === 'if_stage' && (
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select
                  value={getConditionConfig<string>(step, 'stage') ?? ''}
                  onValueChange={(val) => updateConditionConfig('stage', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(step.condition_type === 'if_email_opened' ||
              step.condition_type === 'if_replied') && (
              <p className="text-xs text-muted-foreground">
                No additional configuration required for this condition.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

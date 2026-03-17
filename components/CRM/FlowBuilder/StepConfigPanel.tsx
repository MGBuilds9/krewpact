'use client';

import { X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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

function ConfigField({
  id,
  label,
  children,
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function EmailConfig({
  step,
  update,
}: {
  step: FlowStep;
  update: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <ConfigField id="template_id" label="Template ID">
        <Input
          id="template_id"
          placeholder="template-uuid"
          value={getConfig<string>(step, 'template_id') ?? ''}
          onChange={(e) => update('template_id', e.target.value)}
        />
      </ConfigField>
      <ConfigField id="subject" label="Subject Override">
        <Input
          id="subject"
          placeholder="Leave blank to use template subject"
          value={getConfig<string>(step, 'subject') ?? ''}
          onChange={(e) => update('subject', e.target.value)}
        />
      </ConfigField>
      <ConfigField id="body" label="Body Override">
        <Textarea
          id="body"
          placeholder="Leave blank to use template body"
          rows={4}
          value={getConfig<string>(step, 'body') ?? ''}
          onChange={(e) => update('body', e.target.value)}
        />
      </ConfigField>
    </>
  );
}

function TaskConfig({
  step,
  update,
}: {
  step: FlowStep;
  update: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <ConfigField id="task_title" label="Title">
        <Input
          id="task_title"
          placeholder="Follow up with lead"
          value={getConfig<string>(step, 'title') ?? ''}
          onChange={(e) => update('title', e.target.value)}
        />
      </ConfigField>
      <ConfigField id="task_desc" label="Description">
        <Textarea
          id="task_desc"
          placeholder="Task description..."
          rows={3}
          value={getConfig<string>(step, 'description') ?? ''}
          onChange={(e) => update('description', e.target.value)}
        />
      </ConfigField>
      <ConfigField id="assign_to" label="Assign To (user ID)">
        <Input
          id="assign_to"
          placeholder="user-uuid"
          value={getConfig<string>(step, 'assign_to') ?? ''}
          onChange={(e) => update('assign_to', e.target.value)}
        />
      </ConfigField>
      <ConfigField id="due_in_days" label="Due In (days)">
        <Input
          id="due_in_days"
          type="number"
          min={0}
          placeholder="3"
          value={getConfig<number>(step, 'due_in_days') ?? ''}
          onChange={(e) => update('due_in_days', Number(e.target.value))}
        />
      </ConfigField>
    </>
  );
}

function WaitConfig({
  step,
  onUpdate,
}: {
  step: FlowStep;
  onUpdate: (changes: Partial<FlowStep>) => void;
}) {
  return (
    <>
      <ConfigField id="delay_days" label="Delay Days">
        <Input
          id="delay_days"
          type="number"
          min={0}
          placeholder="0"
          value={step.delay_days ?? ''}
          onChange={(e) => onUpdate({ delay_days: Number(e.target.value) })}
        />
      </ConfigField>
      <ConfigField id="delay_hours" label="Delay Hours">
        <Input
          id="delay_hours"
          type="number"
          min={0}
          max={23}
          placeholder="0"
          value={step.delay_hours ?? ''}
          onChange={(e) => onUpdate({ delay_hours: Number(e.target.value) })}
        />
      </ConfigField>
    </>
  );
}

function ConditionConfig({
  step,
  onUpdate,
  updateConditionConfig,
}: {
  step: FlowStep;
  onUpdate: (changes: Partial<FlowStep>) => void;
  updateConditionConfig: (key: string, value: unknown) => void;
}) {
  return (
    <>
      <ConfigField label="Condition Type">
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
      </ConfigField>
      {step.condition_type === 'if_score' && (
        <ConfigField id="min_score" label="Minimum Score">
          <Input
            id="min_score"
            type="number"
            min={0}
            max={100}
            placeholder="50"
            value={getConditionConfig<number>(step, 'min_score') ?? ''}
            onChange={(e) => updateConditionConfig('min_score', Number(e.target.value))}
          />
        </ConfigField>
      )}
      {step.condition_type === 'if_tag' && (
        <ConfigField id="tag_id" label="Tag ID">
          <Input
            id="tag_id"
            placeholder="tag-uuid"
            value={getConditionConfig<string>(step, 'tag_id') ?? ''}
            onChange={(e) => updateConditionConfig('tag_id', e.target.value)}
          />
        </ConfigField>
      )}
      {step.condition_type === 'if_stage' && (
        <ConfigField label="Stage">
          <Select
            value={getConditionConfig<string>(step, 'stage') ?? ''}
            onValueChange={(val) => updateConditionConfig('stage', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage..." />
            </SelectTrigger>
            <SelectContent>
              {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map(
                (s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </ConfigField>
      )}
      {(step.condition_type === 'if_email_opened' || step.condition_type === 'if_replied') && (
        <p className="text-xs text-muted-foreground">
          No additional configuration required for this condition.
        </p>
      )}
    </>
  );
}

export function StepConfigPanel({ step, onUpdate, onClose }: StepConfigPanelProps) {
  if (!step) return null;
  const updateConfig = (key: string, value: unknown) =>
    onUpdate({ action_config: { ...step.action_config, [key]: value } });
  const updateConditionConfig = (key: string, value: unknown) =>
    onUpdate({ condition_config: { ...(step.condition_config ?? {}), [key]: value } });

  return (
    <div className="flex h-full w-full sm:w-72 shrink-0 flex-col rounded-lg border bg-background shadow-sm">
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {step.action_type === 'email' && <EmailConfig step={step} update={updateConfig} />}
        {step.action_type === 'task' && <TaskConfig step={step} update={updateConfig} />}
        {step.action_type === 'wait' && <WaitConfig step={step} onUpdate={onUpdate} />}
        {step.action_type === 'condition' && (
          <ConditionConfig
            step={step}
            onUpdate={onUpdate}
            updateConditionConfig={updateConditionConfig}
          />
        )}
      </div>
    </div>
  );
}

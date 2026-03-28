'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';

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

export const sequenceFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  trigger_type: z.enum([
    'manual',
    'lead_created',
    'lead_stage_changed',
    'score_threshold',
    'tag_added',
    'form_submitted',
  ]),
  division: z.enum(['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management', 'all']),
});

export type SequenceFormValues = z.infer<typeof sequenceFormSchema>;

export const triggerLabels: Record<string, string> = {
  manual: 'Manual',
  lead_created: 'Lead Created',
  lead_stage_changed: 'Lead Stage Changed',
  score_threshold: 'Score Threshold Reached',
  tag_added: 'Tag Added',
  form_submitted: 'Form Submitted',
};

export const divisionLabels: Record<string, string> = {
  contracting: 'MDM Contracting',
  homes: 'MDM Homes',
  wood: 'MDM Wood',
  telecom: 'MDM Telecom',
  'group-inc': 'MDM Group Inc.',
  management: 'MDM Management',
  all: 'All Divisions',
};

interface SequenceFormFieldsProps {
  register: UseFormRegister<SequenceFormValues>;
  errors: FieldErrors<SequenceFormValues>;
  triggerType: SequenceFormValues['trigger_type'];
  division: SequenceFormValues['division'];
  onTriggerChange: (val: SequenceFormValues['trigger_type']) => void;
  onDivisionChange: (val: SequenceFormValues['division']) => void;
}

export function SequenceFormFields({
  register,
  errors,
  triggerType,
  division,
  onTriggerChange,
  onDivisionChange,
}: SequenceFormFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Sequence Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Initial Outreach — Contracting Leads"
          {...register('name')}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional — describe the purpose of this sequence"
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>
          Trigger <span className="text-destructive">*</span>
        </Label>
        <Select
          value={triggerType}
          onValueChange={(val) => onTriggerChange(val as SequenceFormValues['trigger_type'])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(triggerLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.trigger_type && (
          <p className="text-xs text-destructive">{errors.trigger_type.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>
          Division <span className="text-destructive">*</span>
        </Label>
        <Select
          value={division}
          onValueChange={(val) => onDivisionChange(val as SequenceFormValues['division'])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select division..." />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(divisionLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.division && <p className="text-xs text-destructive">{errors.division.message}</p>}
      </div>
    </>
  );
}

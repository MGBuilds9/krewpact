'use client';

import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { RuleFormFields,type RuleFormState } from './RuleFormFields';

export type { RuleFormState };

interface RuleFormProps {
  form: RuleFormState;
  onChange: (f: RuleFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function RuleForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: RuleFormProps) {
  return (
    <div className="space-y-4">
      <RuleFormFields form={form} onChange={onChange} />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={isSubmitting || !form.name || !form.field_name || !form.value}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}

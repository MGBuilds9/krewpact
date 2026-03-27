'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DIVISION_CODES, type DivisionCode, type DivisionSelection } from '@/lib/validators/org';

import { DIVISION_LABELS } from './onboarding-constants';

interface StepDivisionSetupProps {
  form: UseFormReturn<DivisionSelection>;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggle: (code: DivisionCode, checked: boolean) => void;
}

export function StepDivisionSetup({
  form,
  onBack,
  onSkip,
  onSubmit,
  onToggle,
}: StepDivisionSetupProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Division Setup</h2>
      <p className="text-muted-foreground">Select the divisions your company operates in.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DIVISION_CODES.map((code) => (
            <label
              key={code}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent"
            >
              <Checkbox
                checked={form.watch('divisions').includes(code)}
                onCheckedChange={(checked) => onToggle(code, checked === true)}
              />
              <span className="text-sm font-medium">{DIVISION_LABELS[code]}</span>
            </label>
          ))}
        </div>
        {form.formState.errors.divisions && (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.divisions.message}
          </p>
        )}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

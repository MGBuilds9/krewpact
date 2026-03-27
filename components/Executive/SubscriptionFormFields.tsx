'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SubscriptionFormInput } from './SubscriptionForm';

export const CATEGORY_OPTIONS = [
  { value: 'platform', label: 'Platform' },
  { value: 'dev_tools', label: 'Dev Tools' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'communications', label: 'Communications' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

export const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
];

export const BILLING_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export interface SubscriptionFormFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
  isSubmitting: boolean;
  isPending: boolean;
  isEdit: boolean;
  categoryValue: string | undefined;
  currencyValue: string | undefined;
  billingCycleValue: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: any;
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
  onClose: () => void;
}

export function SubscriptionFormFields({
  register,
  errors,
  isSubmitting,
  isPending,
  isEdit,
  categoryValue,
  currencyValue,
  billingCycleValue,
  setValue,
  onSubmit,
  onClose,
}: SubscriptionFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="sub-name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="sub-name"
          placeholder="e.g. GitHub Teams"
          {...register('name')}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="sub-category">
          Category <span className="text-destructive">*</span>
        </Label>
        <Select
          value={categoryValue ?? ''}
          onValueChange={(val) =>
            setValue('category', val as SubscriptionFormInput['category'], { shouldValidate: true })
          }
        >
          <SelectTrigger id="sub-category" aria-invalid={!!errors.category}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="sub-vendor">Vendor</Label>
        <Input id="sub-vendor" placeholder="e.g. GitHub Inc." {...register('vendor')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="sub-cost">
            Monthly Cost <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sub-cost"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('monthly_cost', { valueAsNumber: true })}
            aria-invalid={!!errors.monthly_cost}
          />
          {errors.monthly_cost && (
            <p className="text-xs text-destructive">{errors.monthly_cost.message}</p>
          )}
        </div>
        <SelectField
          id="sub-currency"
          label="Currency"
          value={currencyValue ?? 'CAD'}
          onChange={(val) => setValue('currency', val, { shouldValidate: true })}
          options={CURRENCY_OPTIONS}
        />
      </div>
      <SelectField
        id="sub-billing-cycle"
        label="Billing Cycle"
        value={billingCycleValue ?? 'monthly'}
        onChange={(val) =>
          setValue('billing_cycle', val as SubscriptionFormInput['billing_cycle'], {
            shouldValidate: true,
          })
        }
        options={BILLING_CYCLE_OPTIONS}
      />
      <div className="space-y-1">
        <Label htmlFor="sub-renewal">Renewal Date</Label>
        <Input id="sub-renewal" type="date" {...register('renewal_date')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sub-notes">Notes</Label>
        <textarea
          id="sub-notes"
          rows={3}
          placeholder="Optional notes..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          {...register('notes')}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={isSubmitting || isPending}>
          {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Subscription'}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

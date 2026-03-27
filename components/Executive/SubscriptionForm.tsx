'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/lib/toast';
import { subscriptionCreateSchema } from '@/lib/validators/executive';

import type { Subscription } from './SubscriptionTable';

type SubscriptionFormInput = z.input<typeof subscriptionCreateSchema>;
type SubscriptionFormOutput = z.output<typeof subscriptionCreateSchema>;

interface SubscriptionFormProps {
  subscription?: Subscription | null;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'platform', label: 'Platform' },
  { value: 'dev_tools', label: 'Dev Tools' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'communications', label: 'Communications' },
  { value: 'infrastructure', label: 'Infrastructure' },
];
const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
];
const BILLING_CYCLE_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

const EMPTY_DEFAULTS: Omit<SubscriptionFormInput, 'category'> & {
  category?: SubscriptionFormInput['category'];
} = {
  name: '',
  category: undefined,
  vendor: '',
  monthly_cost: undefined,
  currency: 'CAD',
  billing_cycle: 'monthly',
  renewal_date: '',
  notes: '',
};

function SelectField({
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

interface SubscriptionFormFieldsProps {
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

function SubscriptionFormFields({
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

export function SubscriptionForm({ subscription, onClose }: SubscriptionFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!subscription;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormInput, unknown, SubscriptionFormOutput>({
    resolver: zodResolver(subscriptionCreateSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    reset(
      subscription
        ? {
            name: subscription.name,
            category: subscription.category as SubscriptionFormInput['category'],
            vendor: subscription.vendor ?? '',
            monthly_cost: subscription.monthly_cost,
            currency: subscription.currency,
            billing_cycle: subscription.billing_cycle as SubscriptionFormInput['billing_cycle'],
            renewal_date: subscription.renewal_date ?? '',
            notes: subscription.notes ?? '',
          }
        : EMPTY_DEFAULTS,
    );
  }, [subscription, reset]);

  const mutation = useMutation({
    mutationFn: (data: SubscriptionFormOutput) =>
      isEdit && subscription
        ? apiFetch(`/api/executive/subscriptions/${subscription.id}`, {
            method: 'PATCH',
            body: data,
          })
        : apiFetch('/api/executive/subscriptions', { method: 'POST', body: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.executive.subscriptions.all });
      showToast.success('Subscription saved');
      onClose();
    },
    onError: () => showToast.error('Failed to save subscription'),
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));
  // eslint-disable-next-line react-hooks/incompatible-library -- form.watch() is intentional for reactive form values
  const categoryValue = watch('category') as string | undefined;
  const currencyValue = watch('currency') as string | undefined;
  const billingCycleValue = watch('billing_cycle') as string | undefined;

  return (
    <Card className="sticky top-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">
          {isEdit ? 'Edit Subscription' : 'Add Subscription'}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close form"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <SubscriptionFormFields
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          isPending={mutation.isPending}
          isEdit={isEdit}
          categoryValue={categoryValue}
          currencyValue={currencyValue}
          billingCycleValue={billingCycleValue}
          setValue={setValue}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      </CardContent>
    </Card>
  );
}

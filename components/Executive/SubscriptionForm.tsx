'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { subscriptionCreateSchema } from '@/lib/validators/executive';
import { showToast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { z } from 'zod';
import type { Subscription } from './SubscriptionTable';

// Use input type for form (allows optional currency/billing_cycle with defaults)
// Use output type for mutation (currency/billing_cycle are always present after Zod parse)
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
    defaultValues: {
      name: '',
      category: undefined,
      vendor: '',
      monthly_cost: undefined,
      currency: 'CAD',
      billing_cycle: 'monthly',
      renewal_date: '',
      notes: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (subscription) {
      reset({
        name: subscription.name,
        category: subscription.category as SubscriptionFormInput['category'],
        vendor: subscription.vendor ?? '',
        monthly_cost: subscription.monthly_cost,
        currency: subscription.currency,
        billing_cycle: subscription.billing_cycle as SubscriptionFormInput['billing_cycle'],
        renewal_date: subscription.renewal_date ?? '',
        notes: subscription.notes ?? '',
      });
    } else {
      reset({
        name: '',
        category: undefined,
        vendor: '',
        monthly_cost: undefined,
        currency: 'CAD',
        billing_cycle: 'monthly',
        renewal_date: '',
        notes: '',
      });
    }
  }, [subscription, reset]);

  const mutation = useMutation({
    mutationFn: async (data: SubscriptionFormOutput) => {
      if (isEdit && subscription) {
        return apiFetch(`/api/executive/subscriptions/${subscription.id}`, {
          method: 'PATCH',
          body: data,
        });
      }
      return apiFetch('/api/executive/subscriptions', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.executive.subscriptions.all });
      showToast.success('Subscription saved');
      onClose();
    },
    onError: () => {
      showToast.error('Failed to save subscription');
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  const categoryValue = watch('category') as string | undefined;
  const currencyValue = watch('currency') as string | undefined;
  const billingCycleValue = watch('billing_cycle') as string | undefined;

  return (
    <Card className="sticky top-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">
          {isEdit ? 'Edit Subscription' : 'Add Subscription'}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
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

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="sub-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={categoryValue ?? ''}
              onValueChange={(val) =>
                setValue('category', val as SubscriptionFormInput['category'], {
                  shouldValidate: true,
                })
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
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>

          {/* Vendor */}
          <div className="space-y-1">
            <Label htmlFor="sub-vendor">Vendor</Label>
            <Input id="sub-vendor" placeholder="e.g. GitHub Inc." {...register('vendor')} />
          </div>

          {/* Monthly Cost + Currency */}
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
            <div className="space-y-1">
              <Label htmlFor="sub-currency">Currency</Label>
              <Select
                value={currencyValue ?? 'CAD'}
                onValueChange={(val) => setValue('currency', val, { shouldValidate: true })}
              >
                <SelectTrigger id="sub-currency">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-1">
            <Label htmlFor="sub-billing-cycle">Billing Cycle</Label>
            <Select
              value={billingCycleValue ?? 'monthly'}
              onValueChange={(val) =>
                setValue('billing_cycle', val as SubscriptionFormInput['billing_cycle'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="sub-billing-cycle">
                <SelectValue placeholder="Billing cycle" />
              </SelectTrigger>
              <SelectContent>
                {BILLING_CYCLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Renewal Date */}
          <div className="space-y-1">
            <Label htmlFor="sub-renewal">Renewal Date</Label>
            <Input id="sub-renewal" type="date" {...register('renewal_date')} />
          </div>

          {/* Notes */}
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Subscription'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

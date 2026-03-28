'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/lib/toast';
import { subscriptionCreateSchema } from '@/lib/validators/executive';

import { SubscriptionFormFields } from './SubscriptionFormFields';
import type { Subscription } from './SubscriptionTable';

export type SubscriptionFormInput = z.input<typeof subscriptionCreateSchema>;
type SubscriptionFormOutput = z.output<typeof subscriptionCreateSchema>;

interface SubscriptionFormProps {
  subscription?: Subscription | null;
  onClose: () => void;
}

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

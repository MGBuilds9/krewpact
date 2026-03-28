'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EstimateAllowance } from '@/hooks/useEstimating';
import { useCreateEstimateAllowance, useUpdateEstimateAllowance } from '@/hooks/useEstimating';

const formSchema = z.object({
  allowance_name: z.string().min(1, 'Name is required').max(200),
  allowance_amount: z.string().min(1, 'Amount is required'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface AllowanceFormProps {
  estimateId: string;
  allowance?: EstimateAllowance;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// eslint-disable-next-line max-lines-per-function
export function AllowanceForm({ estimateId, allowance, onSuccess, onCancel }: AllowanceFormProps) {
  const createAllowance = useCreateEstimateAllowance();
  const updateAllowance = useUpdateEstimateAllowance();
  const isEditing = !!allowance;
  const isPending = createAllowance.isPending || updateAllowance.isPending;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      allowance_name: allowance?.allowance_name ?? '',
      allowance_amount: allowance?.allowance_amount?.toString() ?? '0',
      notes: allowance?.notes ?? '',
    },
  });

  function onSubmit(values: FormValues) {
    const parsedAmount = parseFloat(values.allowance_amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      form.setError('allowance_amount', { message: 'Must be a valid non-negative number' });
      return;
    }
    const payload = {
      allowance_name: values.allowance_name,
      allowance_amount: parsedAmount,
      notes: values.notes || undefined,
    };
    const cb = {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    };
    if (isEditing) {
      updateAllowance.mutate({ estimateId, allowanceId: allowance.id, ...payload }, cb);
    } else {
      createAllowance.mutate({ estimateId, ...payload }, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="allowance_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allowance Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Flooring Allowance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allowance_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (CAD) *</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" min="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Allowance' : 'Add Allowance'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

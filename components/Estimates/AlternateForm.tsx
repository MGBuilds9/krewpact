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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { EstimateAlternate } from '@/hooks/useEstimating';
import { useCreateEstimateAlternate, useUpdateEstimateAlternate } from '@/hooks/useEstimating';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  amount: z.string().min(1, 'Amount is required'),
  selected: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export interface AlternateFormProps {
  estimateId: string;
  alternate?: EstimateAlternate;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AlternateForm({ estimateId, alternate, onSuccess, onCancel }: AlternateFormProps) {
  const createAlternate = useCreateEstimateAlternate();
  const updateAlternate = useUpdateEstimateAlternate();
  const isEditing = !!alternate;
  const isPending = createAlternate.isPending || updateAlternate.isPending;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: alternate?.title ?? '',
      description: alternate?.description ?? '',
      amount: alternate?.amount?.toString() ?? '0',
      selected: alternate?.selected ?? false,
    },
  });

  function onSubmit(values: FormValues) {
    const parsedAmount = parseFloat(values.amount);
    if (isNaN(parsedAmount)) {
      form.setError('amount', { message: 'Must be a valid number' });
      return;
    }
    const payload = {
      title: values.title,
      description: values.description || undefined,
      amount: parsedAmount,
      selected: values.selected,
    };
    const cb = {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    };
    if (isEditing) {
      updateAlternate.mutate({ estimateId, alternateId: alternate.id, ...payload }, cb);
    } else {
      createAlternate.mutate({ estimateId, ...payload }, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Upgrade to hardwood flooring" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the alternate..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (CAD) *</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="selected"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Selected</FormLabel>
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
            {isEditing ? 'Update Alternate' : 'Add Alternate'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

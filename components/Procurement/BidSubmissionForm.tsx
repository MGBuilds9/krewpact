'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  subtotal_amount: z.string().min(1, 'Subtotal is required'),
  tax_amount: z.string().optional(),
  total_amount: z.string().min(1, 'Total is required'),
  currency_code: z.string().length(3).optional(),
  exclusions: z.string().optional(),
  invite_id: z.string().uuid().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface BidSubmissionFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
  inviteId?: string;
}

export function BidSubmissionForm({ onSubmit, isLoading, inviteId }: BidSubmissionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subtotal_amount: '',
      tax_amount: '',
      total_amount: '',
      currency_code: 'CAD',
      exclusions: '',
      invite_id: inviteId ?? '',
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      subtotal_amount: parseFloat(values.subtotal_amount),
      tax_amount: values.tax_amount ? parseFloat(values.tax_amount) : undefined,
      total_amount: parseFloat(values.total_amount),
      currency_code: values.currency_code,
      exclusions: values.exclusions || undefined,
      invite_id: values.invite_id || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="subtotal_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtotal (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tax_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax / HST (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Amount (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="exclusions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exclusions / Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="List any exclusions from scope..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Bid'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { useCreateChangeOrder } from '@/hooks/useFieldOps';

const formSchema = z.object({
  co_number: z.string().min(1),
  change_request_id: z.string().uuid().optional(),
  reason: z.string().optional(),
  amount_delta: z.string().optional(),
  days_delta: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ChangeOrderFormProps {
  projectId: string;
  changeRequestId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChangeOrderForm({
  projectId,
  changeRequestId,
  onSuccess,
  onCancel,
}: ChangeOrderFormProps) {
  const createCO = useCreateChangeOrder(projectId);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      co_number: '',
      change_request_id: changeRequestId,
      reason: '',
      amount_delta: '',
      days_delta: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        co_number: values.co_number,
        change_request_id: values.change_request_id || undefined,
        reason: values.reason || undefined,
        amount_delta: values.amount_delta ? parseFloat(values.amount_delta) : undefined,
        days_delta: values.days_delta ? parseInt(values.days_delta, 10) : undefined,
      };
      await createCO.mutateAsync(payload as Parameters<typeof createCO.mutateAsync>[0]);
      toast.success('Change order created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create change order');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="co_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CO Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. CO-001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Reason for this change order..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount_delta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Delta (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="days_delta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days Delta</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createCO.isPending}>
            {createCO.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Change Order
          </Button>
        </div>
      </form>
    </Form>
  );
}

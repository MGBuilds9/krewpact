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
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  snapshot_date: z.string().min(1, 'Snapshot date is required'),
  baseline_budget: z.string().optional(),
  revised_budget: z.string().optional(),
  committed_cost: z.string().optional(),
  actual_cost: z.string().optional(),
  forecast_cost: z.string().optional(),
  forecast_margin_pct: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface JobCostSnapshotFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function JobCostSnapshotForm({
  defaultValues,
  onSubmit,
  isLoading,
}: JobCostSnapshotFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      snapshot_date: new Date().toISOString().split('T')[0],
      baseline_budget: '',
      revised_budget: '',
      committed_cost: '',
      actual_cost: '',
      forecast_cost: '',
      forecast_margin_pct: '',
      ...defaultValues,
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      snapshot_date: values.snapshot_date,
      baseline_budget: values.baseline_budget ? parseFloat(values.baseline_budget) : undefined,
      revised_budget: values.revised_budget ? parseFloat(values.revised_budget) : undefined,
      committed_cost: values.committed_cost ? parseFloat(values.committed_cost) : undefined,
      actual_cost: values.actual_cost ? parseFloat(values.actual_cost) : undefined,
      forecast_cost: values.forecast_cost ? parseFloat(values.forecast_cost) : undefined,
      forecast_margin_pct: values.forecast_margin_pct
        ? parseFloat(values.forecast_margin_pct)
        : undefined,
      payload: {},
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="snapshot_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Snapshot Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="baseline_budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baseline Budget (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="revised_budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revised Budget (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="committed_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Committed Cost (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actual_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual Cost (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="forecast_cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forecast Cost (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="forecast_margin_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forecast Margin (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="-100" max="100" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Record Snapshot'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

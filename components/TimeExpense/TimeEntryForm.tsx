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

const timeEntryFormSchema = z.object({
  user_id: z.string().uuid(),
  work_date: z.string().min(1),
  hours_regular: z.string().min(1),
  hours_overtime: z.string().optional(),
  cost_code: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof timeEntryFormSchema>;

interface TimeEntryFormProps {
  userId: string;
  onSubmit: (values: { user_id: string; work_date: string; hours_regular: number; hours_overtime?: number; cost_code?: string; notes?: string }) => void;
  isLoading?: boolean;
}

export function TimeEntryForm({ userId, onSubmit, isLoading }: TimeEntryFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(timeEntryFormSchema),
    defaultValues: {
      user_id: userId,
      work_date: new Date().toISOString().split('T')[0],
      hours_regular: '',
      hours_overtime: '',
      cost_code: '',
      notes: '',
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      user_id: values.user_id,
      work_date: values.work_date,
      hours_regular: parseFloat(values.hours_regular),
      hours_overtime: values.hours_overtime ? parseFloat(values.hours_overtime) : undefined,
      cost_code: values.cost_code || undefined,
      notes: values.notes || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="work_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Date</FormLabel>
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
            name="hours_regular"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regular Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.25" min="0" max="24" placeholder="8.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hours_overtime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Overtime Hours</FormLabel>
                <FormControl>
                  <Input type="number" step="0.25" min="0" max="24" placeholder="0.0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cost_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 01-1000" {...field} />
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
                <Textarea placeholder="Work performed..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Log Time'}
        </Button>
      </form>
    </Form>
  );
}

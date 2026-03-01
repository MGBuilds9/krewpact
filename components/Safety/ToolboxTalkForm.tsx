'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toolboxTalkCreateSchema } from '@/lib/validators/safety';
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

type FormValues = z.infer<typeof toolboxTalkCreateSchema>;

interface ToolboxTalkFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

export function ToolboxTalkForm({ onSubmit, isLoading }: ToolboxTalkFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(toolboxTalkCreateSchema),
    defaultValues: {
      talk_date: new Date().toISOString().split('T')[0],
      topic: '',
      attendee_count: 0,
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="talk_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Talk Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fall Protection, WHMIS, PPE Requirements" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="attendee_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attendee Count</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
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
                <Textarea placeholder="Key takeaways, action items..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Log Toolbox Talk'}
        </Button>
      </form>
    </Form>
  );
}

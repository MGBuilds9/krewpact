'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

const formSchema = z.object({
  bid_id: z.string().uuid('Must be a valid bid ID'),
  normalized_total: z.string().min(1, 'Normalized total is required'),
  risk_score: z.string().optional(),
  recommended: z.boolean().optional(),
  rationale: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BidLevelingEntryFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function BidLevelingEntryForm({ onSubmit, isLoading }: BidLevelingEntryFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bid_id: '',
      normalized_total: '',
      risk_score: '',
      recommended: false,
      rationale: '',
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      bid_id: values.bid_id,
      normalized_total: parseFloat(values.normalized_total),
      risk_score: values.risk_score ? parseFloat(values.risk_score) : undefined,
      recommended: values.recommended,
      rationale: values.rationale || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bid_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bid ID</FormLabel>
                <FormControl>
                  <Input placeholder="Bid UUID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="normalized_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Normalized Total (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="risk_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk Score (0-100)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recommended"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 pt-6">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Recommended</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="rationale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rationale</FormLabel>
              <FormControl>
                <Textarea placeholder="Explain the leveling decision..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Add Entry'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

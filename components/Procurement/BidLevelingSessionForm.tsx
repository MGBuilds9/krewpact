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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BidLevelingSessionFormProps {
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
}

export function BidLevelingSessionForm({ onSubmit, isLoading }: BidLevelingSessionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { notes: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notes on this leveling session, assumptions, adjustments..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Leveling Session'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const expenseApprovalFormSchema = z.object({
  decision: z.string().min(1),
  reviewer_notes: z.string().optional(),
});

type FormValues = z.infer<typeof expenseApprovalFormSchema>;

interface ExpenseApprovalFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

export function ExpenseApprovalForm({ onSubmit, isLoading }: ExpenseApprovalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(expenseApprovalFormSchema),
    defaultValues: { decision: 'approved', reviewer_notes: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="decision"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Decision</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                  <SelectItem value="needs_info">Request More Info</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reviewer_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reviewer Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional notes for the submitter..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Submit Decision'}
        </Button>
      </form>
    </Form>
  );
}

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { timesheetBatchApprovalSchema } from '@/lib/validators/time-expense';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FormValues = z.infer<typeof timesheetBatchApprovalSchema>;

interface TimesheetBatchApprovalFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

export function TimesheetBatchApprovalForm({
  onSubmit,
  isLoading,
}: TimesheetBatchApprovalFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(timesheetBatchApprovalSchema),
    defaultValues: { status: 'approved' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="status"
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
                  <SelectItem value="submitted">Return to Submitted</SelectItem>
                </SelectContent>
              </Select>
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

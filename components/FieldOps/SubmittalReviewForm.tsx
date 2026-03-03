'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { submittalReviewSchema } from '@/lib/validators/field-ops';
import { useCreateSubmittalReview } from '@/hooks/useFieldOps';
import { toast } from 'sonner';

type FormValues = z.infer<typeof submittalReviewSchema>;

interface SubmittalReviewFormProps {
  projectId: string;
  subId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubmittalReviewForm({
  projectId,
  subId,
  onSuccess,
  onCancel,
}: SubmittalReviewFormProps) {
  const createReview = useCreateSubmittalReview(projectId, subId);

  const form = useForm<FormValues>({
    resolver: zodResolver(submittalReviewSchema),
    defaultValues: {
      outcome: 'approved',
      review_notes: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createReview.mutateAsync(values as Parameters<typeof createReview.mutateAsync>[0]);
      toast.success('Review submitted');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to submit review');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="approved_as_noted">Approved as Noted</SelectItem>
                  <SelectItem value="revise_and_resubmit">Revise and Resubmit</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="review_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review Notes (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add review comments..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createReview.isPending}>
            {createReview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Review
          </Button>
        </div>
      </form>
    </Form>
  );
}

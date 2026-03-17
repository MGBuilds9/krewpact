'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { useCreateTaskComment } from '@/hooks/useProjectExtended';

const formSchema = z.object({
  comment_text: z.string().min(1, 'Comment is required').max(2000),
});

type FormValues = z.infer<typeof formSchema>;

export interface TaskCommentFormProps {
  taskId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskCommentForm({ taskId, onSuccess, onCancel }: TaskCommentFormProps) {
  const createComment = useCreateTaskComment(taskId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment_text: '',
    },
  });

  function onSubmit(values: FormValues) {
    createComment.mutate(values, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="comment_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comment *</FormLabel>
              <FormControl>
                <Textarea placeholder="Add a comment..." rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-1">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={createComment.isPending}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createComment.isPending}>
            {createComment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Post Comment
          </Button>
        </div>
      </form>
    </Form>
  );
}

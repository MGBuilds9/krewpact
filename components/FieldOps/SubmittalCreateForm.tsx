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
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { submittalCreateSchema } from '@/lib/validators/field-ops';
import { useCreateSubmittal } from '@/hooks/useFieldOps';
import { toast } from 'sonner';

type FormValues = z.infer<typeof submittalCreateSchema>;

interface SubmittalCreateFormProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SubmittalCreateForm({
  projectId,
  onSuccess,
  onCancel,
}: SubmittalCreateFormProps) {
  const createSubmittal = useCreateSubmittal(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(submittalCreateSchema),
    defaultValues: {
      submittal_number: '',
      title: '',
      due_at: '',
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const payload = { ...values, due_at: values.due_at || undefined };
      await createSubmittal.mutateAsync(
        payload as Parameters<typeof createSubmittal.mutateAsync>[0],
      );
      toast.success('Submittal created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create submittal');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="submittal_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Submittal Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. SUB-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date (optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Structural Steel Shop Drawings" {...field} />
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
          <Button type="submit" disabled={createSubmittal.isPending}>
            {createSubmittal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Submittal
          </Button>
        </div>
      </form>
    </Form>
  );
}

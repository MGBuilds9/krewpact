'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useCreateReferenceDataSet } from '@/hooks/useGovernance';
import { referenceDataSetSchema } from '@/lib/validators/governance';
import { toast } from 'sonner';

type FormValues = z.infer<typeof referenceDataSetSchema>;

interface ReferenceDataSetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReferenceDataSetForm({ onSuccess, onCancel }: ReferenceDataSetFormProps) {
  const create = useCreateReferenceDataSet();

  const form = useForm<FormValues>({
    resolver: zodResolver(referenceDataSetSchema),
    defaultValues: { set_key: '', set_name: '', status: 'draft' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success('Reference data set created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create reference data set');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="set_key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input placeholder="e.g. project_types" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="set_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Project Types" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Set
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}

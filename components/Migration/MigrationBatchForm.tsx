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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useCreateMigrationBatch } from '@/hooks/useMigration';
import { migrationBatchCreateSchema } from '@/lib/validators/migration';
import { toast } from 'sonner';

type FormValues = z.infer<typeof migrationBatchCreateSchema>;

interface MigrationBatchFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SOURCE_SYSTEMS = ['sage_50', 'sage_construction', 'almyta', 'erpnext', 'excel', 'other'];

export function MigrationBatchForm({ onSuccess, onCancel }: MigrationBatchFormProps) {
  const create = useCreateMigrationBatch();

  const form = useForm<FormValues>({
    resolver: zodResolver(migrationBatchCreateSchema),
    defaultValues: { source_system: '', batch_name: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await create.mutateAsync(values);
      toast.success('Migration batch created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create migration batch');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="source_system"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source System</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SOURCE_SYSTEMS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="batch_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batch Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Sage 50 Customers — Feb 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Batch
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

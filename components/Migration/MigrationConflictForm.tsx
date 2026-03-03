'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { useResolveMigrationConflict } from '@/hooks/useMigration';
import { migrationConflictResolutionSchema } from '@/lib/validators/migration';
import { toast } from 'sonner';

type FormValues = z.infer<typeof migrationConflictResolutionSchema>;

interface MigrationConflictFormProps {
  batchId: string;
  conflictId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MigrationConflictForm({
  batchId,
  conflictId,
  onSuccess,
  onCancel,
}: MigrationConflictFormProps) {
  const resolve = useResolveMigrationConflict(batchId);

  const form = useForm<FormValues>({
    resolver: zodResolver(migrationConflictResolutionSchema),
    defaultValues: { resolution_status: 'resolved', resolution_notes: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await resolve.mutateAsync({ conflictId, ...values });
      toast.success('Conflict resolved');
      onSuccess?.();
    } catch {
      toast.error('Failed to resolve conflict');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="resolution_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resolution</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="skipped">Skip</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resolution_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Resolution notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={resolve.isPending}>
            {resolve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Resolution
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

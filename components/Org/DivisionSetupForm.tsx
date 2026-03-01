'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useCreateDivision } from '@/hooks/useOrg';
import { divisionSetupCreateSchema } from '@/lib/validators/org';
import { toast } from 'sonner';

type FormValues = z.infer<typeof divisionSetupCreateSchema>;

interface DivisionSetupFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DivisionSetupForm({ onSuccess, onCancel }: DivisionSetupFormProps) {
  const createDivision = useCreateDivision();

  const form = useForm<FormValues>({
    resolver: zodResolver(divisionSetupCreateSchema),
    defaultValues: { division_name: '', division_code: '', description: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createDivision.mutateAsync(values);
      toast.success('Division created');
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Failed to create division');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="division_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Division Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. MDM Contracting" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="division_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Division Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g. contracting" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Division description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createDivision.isPending}>
            {createDivision.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Division
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          )}
        </div>
      </form>
    </Form>
  );
}

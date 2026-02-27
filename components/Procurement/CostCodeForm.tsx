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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  division_id: z.string().uuid('Must be a valid division ID'),
  cost_code: z.string().min(1, 'Cost code is required'),
  cost_code_name: z.string().min(1, 'Cost code name is required'),
  parent_cost_code_id: z.string().uuid().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CostCodeFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: Partial<FormValues>) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function CostCodeForm({ defaultValues, onSubmit, isLoading, mode = 'create' }: CostCodeFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      division_id: '',
      cost_code: '',
      cost_code_name: '',
      parent_cost_code_id: '',
      is_active: true,
      ...defaultValues,
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      ...values,
      parent_cost_code_id: values.parent_cost_code_id || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Code</FormLabel>
                <FormControl>
                  <Input placeholder="03-000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cost_code_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Code Name</FormLabel>
                <FormControl>
                  <Input placeholder="Concrete" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="division_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Division ID</FormLabel>
                <FormControl>
                  <Input placeholder="Division UUID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="parent_cost_code_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Cost Code ID (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Parent UUID for sub-codes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {mode === 'edit' && (
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="font-normal">Active</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Cost Code' : 'Update Cost Code'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

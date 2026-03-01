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

const formSchema = z.object({
  division_id: z.string().uuid('Must be a valid division ID'),
  local_cost_code: z.string().min(1, 'Local cost code is required'),
  erp_cost_code: z.string().min(1, 'ERP cost code is required'),
  adp_labor_code: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CostCodeMappingFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
}

export function CostCodeMappingForm({ defaultValues, onSubmit, isLoading }: CostCodeMappingFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      division_id: '',
      local_cost_code: '',
      erp_cost_code: '',
      adp_labor_code: '',
      ...defaultValues,
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      ...values,
      adp_labor_code: values.adp_labor_code || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="local_cost_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local Cost Code</FormLabel>
                <FormControl>
                  <Input placeholder="03-000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="erp_cost_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ERPNext Cost Code</FormLabel>
                <FormControl>
                  <Input placeholder="ERP cost code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="adp_labor_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ADP Labor Code (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="ADP labor code" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Mapping'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

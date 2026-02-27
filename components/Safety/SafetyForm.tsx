'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { safetyFormCreateSchema } from '@/lib/validators/safety';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FormValues = z.infer<typeof safetyFormCreateSchema>;

interface SafetyFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

const FORM_TYPES = ['JSA', 'FLHA', 'Pre-Task Hazard', 'Near Miss', 'Other'] as const;

export function SafetyForm({ onSubmit, isLoading }: SafetyFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(safetyFormCreateSchema),
    defaultValues: {
      form_type: '',
      form_date: new Date().toISOString().split('T')[0],
      payload: {},
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="form_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Form Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FORM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="form_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Form Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Create Safety Form'}
        </Button>
      </form>
    </Form>
  );
}

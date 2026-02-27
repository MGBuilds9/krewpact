'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { inspectionCreateSchema } from '@/lib/validators/safety';
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

type FormValues = z.infer<typeof inspectionCreateSchema>;

interface InspectionFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

const INSPECTION_TYPES = [
  'Site Safety',
  'Equipment',
  'Fire Prevention',
  'Electrical',
  'Scaffolding',
  'Environmental',
  'Quality',
  'Other',
] as const;

export function InspectionForm({ onSubmit, isLoading }: InspectionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(inspectionCreateSchema),
    defaultValues: {
      inspection_type: '',
      inspection_date: new Date().toISOString().split('T')[0],
      payload: {},
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="inspection_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inspection Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inspection type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INSPECTION_TYPES.map((t) => (
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
          name="inspection_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inspection Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Create Inspection'}
        </Button>
      </form>
    </Form>
  );
}

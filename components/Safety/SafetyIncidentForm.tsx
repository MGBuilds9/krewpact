'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { safetyIncidentCreateSchema } from '@/lib/validators/safety';

type FormValues = z.infer<typeof safetyIncidentCreateSchema>;

interface SafetyIncidentFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

// eslint-disable-next-line max-lines-per-function
export function SafetyIncidentForm({ onSubmit, isLoading }: SafetyIncidentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(safetyIncidentCreateSchema),
    defaultValues: {
      incident_date: new Date().toISOString().split('T')[0],
      severity: 'low',
      summary: '',
      details: {},
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="incident_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Incident Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severity</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(['low', 'medium', 'high', 'critical'] as const).map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
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
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Input placeholder="Brief incident summary" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detailed Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what happened, root cause, conditions..."
                  rows={4}
                  value={
                    typeof field.value?.description === 'string' ? field.value.description : ''
                  }
                  onChange={(e) => field.onChange({ description: e.target.value })}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Report Incident'}
        </Button>
      </form>
    </Form>
  );
}

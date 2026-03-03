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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  rfq_number: z.string().min(1, 'RFQ number is required'),
  title: z.string().min(1, 'Title is required').max(200),
  scope_summary: z.string().optional(),
  due_at: z.string().optional(),
  status: z.enum(['draft', 'issued', 'closed', 'awarded', 'cancelled']).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RFQPackageFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function RFQPackageForm({
  defaultValues,
  onSubmit,
  isLoading,
  mode = 'create',
}: RFQPackageFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rfq_number: '',
      title: '',
      scope_summary: '',
      due_at: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rfq_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RFQ Number</FormLabel>
                <FormControl>
                  <Input placeholder="RFQ-2026-001" {...field} />
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
                <FormLabel>Due Date</FormLabel>
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
                <Input placeholder="Electrical rough-in — Phase 2" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scope_summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scope Summary</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the scope of work..." rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {mode === 'edit' && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create RFQ' : 'Update RFQ'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

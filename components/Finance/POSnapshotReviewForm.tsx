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

const formSchema = z.object({
  po_number: z.string().min(1, 'PO number is required'),
  supplier_name: z.string().optional(),
  po_date: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'received', 'closed', 'cancelled']).optional(),
  subtotal_amount: z.string().optional(),
  tax_amount: z.string().optional(),
  total_amount: z.string().optional(),
  erp_docname: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface POSnapshotReviewFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

const PO_AMOUNT_FIELDS: { name: keyof FormValues; label: string }[] = [
  { name: 'subtotal_amount', label: 'Subtotal (CAD)' },
  { name: 'tax_amount', label: 'Tax / HST (CAD)' },
  { name: 'total_amount', label: 'Total Amount (CAD)' },
];

export function POSnapshotReviewForm({
  defaultValues,
  onSubmit,
  isLoading,
}: POSnapshotReviewFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      po_number: '',
      supplier_name: '',
      po_date: '',
      subtotal_amount: '',
      tax_amount: '',
      total_amount: '',
      erp_docname: '',
      ...defaultValues,
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      ...values,
      subtotal_amount: values.subtotal_amount ? parseFloat(values.subtotal_amount) : undefined,
      tax_amount: values.tax_amount ? parseFloat(values.tax_amount) : undefined,
      total_amount: values.total_amount ? parseFloat(values.total_amount) : undefined,
      snapshot_payload: {},
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="po_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Number</FormLabel>
                <FormControl>
                  <Input placeholder="PO-2026-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supplier_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier Name</FormLabel>
                <FormControl>
                  <Input placeholder="Supplier name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="po_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {PO_AMOUNT_FIELDS.map(({ name, label }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="erp_docname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ERP Doc Name</FormLabel>
                <FormControl>
                  <Input placeholder="ERPNext document reference" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save PO Snapshot'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

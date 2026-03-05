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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  customer_name: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'paid', 'overdue', 'cancelled']).optional(),
  subtotal_amount: z.string().optional(),
  tax_amount: z.string().optional(),
  total_amount: z.string().optional(),
  amount_paid: z.string().optional(),
  payment_link_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  erp_docname: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceSnapshotReviewFormProps {
  defaultValues?: Partial<FormValues>;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function InvoiceSnapshotReviewForm({
  defaultValues,
  onSubmit,
  isLoading,
}: InvoiceSnapshotReviewFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoice_number: '',
      customer_name: '',
      invoice_date: '',
      due_date: '',
      subtotal_amount: '',
      tax_amount: '',
      total_amount: '',
      amount_paid: '',
      payment_link_url: '',
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
      amount_paid: values.amount_paid ? parseFloat(values.amount_paid) : undefined,
      payment_link_url: values.payment_link_url || undefined,
      snapshot_payload: {},
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoice_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Number</FormLabel>
                <FormControl>
                  <Input placeholder="INV-2026-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="customer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="Customer name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="invoice_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
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
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <FormField
            control={form.control}
            name="subtotal_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtotal (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tax_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax / HST (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Amount (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount_paid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid (CAD)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="payment_link_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Link URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Invoice Snapshot'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

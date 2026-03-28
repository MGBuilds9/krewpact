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

const COMPLIANCE_TYPES = [
  'WSIB Clearance Certificate',
  'Certificate of Insurance (COI)',
  'CCDC Contract',
  'ISN Registration',
  'Trade License',
  'Business License',
  'Health & Safety Policy',
  'Other',
] as const;

const formSchema = z.object({
  portal_account_id: z.string().uuid('Must be a valid UUID'),
  compliance_type: z.string().min(1, 'Compliance type is required'),
  doc_number: z.string().optional(),
  issued_on: z.string().optional(),
  expires_on: z.string().optional(),
  file_id: z.string().uuid().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface ComplianceDocUploadFormProps {
  portalAccountId?: string;
  onSubmit: (data: Partial<FormValues>) => void;
  isLoading?: boolean;
}

// eslint-disable-next-line max-lines-per-function
export function ComplianceDocUploadForm({
  portalAccountId,
  onSubmit,
  isLoading,
}: ComplianceDocUploadFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      portal_account_id: portalAccountId ?? '',
      compliance_type: '',
      doc_number: '',
      issued_on: '',
      expires_on: '',
      file_id: '',
    },
  });

  function handleSubmit(values: FormValues) {
    onSubmit({
      ...values,
      file_id: values.file_id || undefined,
      doc_number: values.doc_number || undefined,
      issued_on: values.issued_on || undefined,
      expires_on: values.expires_on || undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="portal_account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portal Account ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="Trade partner portal account UUID"
                  {...field}
                  readOnly={!!portalAccountId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="compliance_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COMPLIANCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="doc_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Number</FormLabel>
                <FormControl>
                  <Input placeholder="Policy or certificate number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="file_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>File ID (Supabase Storage)</FormLabel>
                <FormControl>
                  <Input placeholder="File UUID after upload" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="issued_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issued On</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expires_on"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expires On</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Submit Document'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

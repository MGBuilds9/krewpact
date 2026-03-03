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
import { Loader2 } from 'lucide-react';
import { useUpdateContractTerms } from '@/hooks/useContracting';

const formSchema = z.object({
  legal_text_version: z.string().min(1, 'Legal text version is required').max(50),
  terms_payload: z.string().min(1, 'Terms payload is required'),
  amendment_reason: z.string().min(1, 'Amendment reason is required').max(500),
});

type FormValues = z.infer<typeof formSchema>;

export interface ContractAmendmentFormProps {
  contractId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ContractAmendmentForm({
  contractId,
  onSuccess,
  onCancel,
}: ContractAmendmentFormProps) {
  const updateContract = useUpdateContractTerms();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      legal_text_version: '',
      terms_payload: '',
      amendment_reason: '',
    },
  });

  const isPending = updateContract.isPending;

  function onSubmit(values: FormValues) {
    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(values.terms_payload);
    } catch {
      form.setError('terms_payload', { message: 'Must be valid JSON' });
      return;
    }

    updateContract.mutate(
      {
        id: contractId,
        legal_text_version: values.legal_text_version,
        terms_payload: { ...parsedPayload, amendment_reason: values.amendment_reason },
        contract_status: 'amended' as const,
      },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="legal_text_version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Legal Text Version *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. v1.1, 2026-03-01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terms_payload"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms Payload (JSON) *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"clauses": [], "jurisdiction": "Ontario"}'
                  rows={6}
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amendment_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amendment Reason *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the reason for this amendment..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Amendment
          </Button>
        </div>
      </form>
    </Form>
  );
}

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
import { useCreateContractTerms, useUpdateContractTerms } from '@/hooks/useContracting';
import type { ContractTerms } from '@/hooks/useContracting';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  legal_text_version: z.string().min(1, 'Legal text version is required').max(50),
  terms_payload: z.string().min(1, 'Terms payload is required'),
});

type FormValues = z.infer<typeof formSchema>;

export interface ContractTermsFormProps {
  contractTerms?: ContractTerms;
  proposalId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ContractTermsForm({
  contractTerms,
  proposalId,
  onSuccess,
  onCancel,
}: ContractTermsFormProps) {
  const createTerms = useCreateContractTerms();
  const updateTerms = useUpdateContractTerms();
  const isEditing = !!contractTerms;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      legal_text_version: contractTerms?.legal_text_version ?? '',
      terms_payload: contractTerms?.terms_payload
        ? JSON.stringify(contractTerms.terms_payload, null, 2)
        : '',
    },
  });

  const isPending = createTerms.isPending || updateTerms.isPending;

  function onSubmit(values: FormValues) {
    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(values.terms_payload);
    } catch {
      form.setError('terms_payload', { message: 'Must be valid JSON' });
      return;
    }

    const payload = {
      legal_text_version: values.legal_text_version,
      terms_payload: parsedPayload,
      proposal_id: proposalId,
    };

    if (isEditing) {
      updateTerms.mutate(
        { id: contractTerms.id, ...payload },
        {
          onSuccess: () => {
            form.reset();
            onSuccess?.();
          },
        },
      );
    } else {
      createTerms.mutate(payload, {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      });
    }
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
                <Input placeholder="e.g. v1.0, 2026-02-01" {...field} />
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
                  rows={8}
                  className="font-mono text-sm"
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
            {isEditing ? 'Update Contract' : 'Create Contract'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

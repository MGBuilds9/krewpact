'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCreateProposal } from '@/hooks/useContracting';

const formSchema = z.object({
  proposal_title: z.string().min(1, 'Title is required').max(200),
  cover_letter: z.string().optional(),
  include_alternates: z.boolean().optional(),
  include_allowances: z.boolean().optional(),
  expires_on: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ProposalGenerationFormProps {
  estimateId: string;
  estimateNumber?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProposalGenerationForm({ estimateId, estimateNumber, onSuccess, onCancel }: ProposalGenerationFormProps) {
  const createProposal = useCreateProposal();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proposal_title: estimateNumber ? `Proposal for ${estimateNumber}` : '',
      cover_letter: '',
      include_alternates: true,
      include_allowances: true,
      expires_on: '',
      notes: '',
    },
  });

  const isPending = createProposal.isPending;

  function onSubmit(values: FormValues) {
    createProposal.mutate(
      {
        estimate_id: estimateId,
        proposal_payload: {
          proposal_title: values.proposal_title,
          cover_letter: values.cover_letter || undefined,
          include_alternates: values.include_alternates,
          include_allowances: values.include_allowances,
          notes: values.notes || undefined,
        },
        expires_on: values.expires_on || undefined,
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
          name="proposal_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proposal Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Proposal for Kitchen Renovation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cover_letter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Letter</FormLabel>
              <FormControl>
                <Textarea placeholder="Cover letter content..." rows={5} {...field} />
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
              <FormLabel>Expiry Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Internal notes..." rows={3} {...field} />
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
            Generate Proposal
          </Button>
        </div>
      </form>
    </Form>
  );
}

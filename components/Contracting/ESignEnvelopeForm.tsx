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
import { useCreateESignEnvelope } from '@/hooks/useContracting';
import { Loader2 } from 'lucide-react';

const providers = ['boldsign'] as const;

const providerLabels: Record<string, string> = {
  boldsign: 'BoldSign',
};

const formSchema = z.object({
  signer_count: z.string().min(1, 'Signer count is required'),
  provider: z.enum(providers),
});

type FormValues = z.infer<typeof formSchema>;

export interface ESignEnvelopeFormProps {
  contractId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ESignEnvelopeForm({ contractId, onSuccess, onCancel }: ESignEnvelopeFormProps) {
  const createEnvelope = useCreateESignEnvelope();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      signer_count: '1',
      provider: 'boldsign',
    },
  });

  const isPending = createEnvelope.isPending;

  function onSubmit(values: FormValues) {
    const signerCount = parseInt(values.signer_count, 10);
    if (isNaN(signerCount) || signerCount < 1) {
      form.setError('signer_count', { message: 'Must be a valid positive integer' });
      return;
    }

    createEnvelope.mutate(
      {
        contract_id: contractId,
        provider: values.provider,
        signer_count: signerCount,
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
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p} value={p}>
                      {providerLabels[p]}
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
          name="signer_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Signer Count *</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="1" placeholder="e.g. 2" {...field} />
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
            Create Envelope
          </Button>
        </div>
      </form>
    </Form>
  );
}

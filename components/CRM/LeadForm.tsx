'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leadCreateSchema, leadUpdateSchema, type LeadCreate, type LeadUpdate } from '@/lib/validators/crm';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateLead, useUpdateLead, type Lead } from '@/hooks/useCRM';
import { Loader2 } from 'lucide-react';

interface LeadFormProps {
  /** Existing lead for edit mode. Omit for create mode. */
  lead?: Lead;
  /** Called after successful create/update */
  onSuccess?: (lead: Lead) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const isEdit = !!lead;
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const form = useForm<LeadCreate | LeadUpdate>({
    resolver: zodResolver(isEdit ? leadUpdateSchema : leadCreateSchema),
    defaultValues: {
      lead_name: lead?.lead_name ?? '',
      source: lead?.source ?? undefined,
      company_name: lead?.company_name ?? undefined,
      email: lead?.email ?? undefined,
      phone: lead?.phone ?? undefined,
      estimated_value: lead?.estimated_value ?? undefined,
      probability_pct: lead?.probability_pct ?? undefined,
    },
  });

  const isPending = createLead.isPending || updateLead.isPending;

  function onSubmit(raw: LeadCreate | LeadUpdate) {
    // Strip empty strings to undefined so optional Zod fields pass
    const values = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as LeadCreate | LeadUpdate;
    if (isEdit && lead) {
      updateLead.mutate(
        { id: lead.id, ...values },
        {
          onSuccess: (data) => {
            onSuccess?.(data as Lead);
          },
        },
      );
    } else {
      createLead.mutate(values as LeadCreate, {
        onSuccess: (data) => {
          onSuccess?.(data as Lead);
        },
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="lead_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Renovation Project" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. referral, website" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="416-555-0100" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estimated_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Value ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="probability_pct"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probability (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

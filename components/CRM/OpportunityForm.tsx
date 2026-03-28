'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

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
import { type Opportunity, useCreateOpportunity, useUpdateOpportunity } from '@/hooks/useCRM';
import {
  type OpportunityCreate,
  opportunityCreateSchema,
  type OpportunityUpdate,
  opportunityUpdateSchema,
} from '@/lib/validators/crm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormProp = any;

interface OpportunityFormProps {
  opportunity?: Opportunity;
  leadId?: string;
  onSuccess?: (opportunity: Opportunity) => void;
  onCancel?: () => void;
}

function buildDefaultValues(opportunity?: Opportunity, leadId?: string) {
  return {
    opportunity_name: opportunity?.opportunity_name ?? '',
    lead_id: opportunity?.lead_id ?? leadId ?? undefined,
    target_close_date: opportunity?.target_close_date ?? undefined,
    estimated_revenue: opportunity?.estimated_revenue ?? undefined,
    probability_pct: opportunity?.probability_pct ?? undefined,
  };
}

// eslint-disable-next-line max-lines-per-function
function OpportunityFormFields({
  form,
  isEdit,
  isPending,
  onCancel,
}: {
  form: FormProp;
  isEdit: boolean;
  isPending: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="opportunity_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Opportunity Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Renovation Phase 1" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="target_close_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Close Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="estimated_revenue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Revenue ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
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
                onChange={(e) =>
                  field.onChange(e.target.value ? Number(e.target.value) : undefined)
                }
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
          {isEdit ? 'Save Changes' : 'Create Opportunity'}
        </Button>
      </div>
    </>
  );
}

export function OpportunityForm({
  opportunity,
  leadId,
  onSuccess,
  onCancel,
}: OpportunityFormProps) {
  const isEdit = !!opportunity;
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();
  const isPending = createOpportunity.isPending || updateOpportunity.isPending;

  const form = useForm<OpportunityCreate | OpportunityUpdate>({
    resolver: zodResolver(isEdit ? opportunityUpdateSchema : opportunityCreateSchema),
    defaultValues: buildDefaultValues(opportunity, leadId),
  });

  function onSubmit(values: OpportunityCreate | OpportunityUpdate) {
    const cb = { onSuccess: (data: unknown) => onSuccess?.(data as Opportunity) };
    if (isEdit && opportunity) {
      updateOpportunity.mutate({ id: opportunity.id, ...values }, cb);
    } else {
      createOpportunity.mutate(values as OpportunityCreate, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <OpportunityFormFields
          form={form}
          isEdit={isEdit}
          isPending={isPending}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}

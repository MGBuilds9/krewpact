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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDivision } from '@/contexts/DivisionContext';
import { type Lead, useAccounts, useCreateLead, useUpdateLead } from '@/hooks/useCRM';
import { SOURCE_CHANNELS } from '@/lib/crm/constants';
import { formatStatus } from '@/lib/format-status';
import {
  type LeadCreate,
  leadCreateSchema,
  type LeadUpdate,
  leadUpdateSchema,
} from '@/lib/validators/crm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormProp = any;

interface LeadFormProps {
  lead?: Lead;
  onSuccess?: (lead: Lead) => void;
  onCancel?: () => void;
}
const INDUSTRIES = [
  'Restaurant & Food Service',
  'Retail',
  'Healthcare & Medical',
  'Residential',
  'Commercial Office',
  'Telecommunications',
  'Industrial',
  'Government & Institutional',
  'Hospitality',
  'Other',
];
const PROVINCES = ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE', 'NT', 'NU', 'YT'];

function cleanValues(raw: LeadCreate | LeadUpdate): LeadCreate | LeadUpdate {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v])) as
    | LeadCreate
    | LeadUpdate;
}

function buildDefaultValues(lead?: Lead, divisionId?: string) {
  return {
    company_name: lead?.company_name ?? '',
    division_id: lead?.division_id ?? divisionId ?? undefined,
    source_channel: lead?.source_channel ?? undefined,
    industry: lead?.industry ?? undefined,
    city: lead?.city ?? undefined,
    province: lead?.province ?? 'ON',
    account_id: undefined as string | undefined,
  };
}

// eslint-disable-next-line max-lines-per-function
function LeadFormFields({
  form,
  isEdit,
  accounts,
  isPending,
  onCancel,
}: {
  form: FormProp;
  isEdit: boolean;
  accounts: { id: string; account_name: string }[];
  isPending: boolean;
  onCancel?: () => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="company_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name *</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Tim Hortons, Rogers" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
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
          name="source_channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="How did they find us?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SOURCE_CHANNELS.map((src) => (
                    <SelectItem key={src} value={src}>
                      {formatStatus(src)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {!isEdit && (
        <FormField
          control={form.control}
          name="account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Linked Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to existing account (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mississauga" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Province</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? 'ON'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Province" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROVINCES.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </>
  );
}

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const isEdit = !!lead;
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { activeDivision } = useDivision();
  const isPending = createLead.isPending || updateLead.isPending;
  const { data: accountsResponse } = useAccounts({ limit: 100 });
  const form = useForm<LeadCreate | LeadUpdate>({
    resolver: zodResolver(isEdit ? leadUpdateSchema : leadCreateSchema),
    defaultValues: buildDefaultValues(lead, activeDivision?.id),
  });

  function onSubmit(raw: LeadCreate | LeadUpdate) {
    const values = cleanValues(raw);
    const cb = { onSuccess: (data: unknown) => onSuccess?.(data as Lead) };
    if (isEdit && lead) {
      updateLead.mutate({ id: lead.id, ...values }, cb);
    } else {
      createLead.mutate(values as LeadCreate, cb);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <LeadFormFields
          form={form}
          isEdit={isEdit}
          accounts={accountsResponse?.data ?? []}
          isPending={isPending}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}

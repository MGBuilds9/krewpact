'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  leadCreateSchema,
  leadUpdateSchema,
  type LeadCreate,
  type LeadUpdate,
} from '@/lib/validators/crm';
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
import { useCreateLead, useUpdateLead, type Lead } from '@/hooks/useCRM';
import { useDivision } from '@/contexts/DivisionContext';
import { Loader2 } from 'lucide-react';

interface LeadFormProps {
  /** Existing lead for edit mode. Omit for create mode. */
  lead?: Lead;
  /** Called after successful create/update */
  onSuccess?: (lead: Lead) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

const SOURCE_CHANNELS = [
  'referral',
  'website',
  'cold_outreach',
  'linkedin',
  'trade_show',
  'bid_board',
  'repeat_client',
  'other',
];

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

export function LeadForm({ lead, onSuccess, onCancel }: LeadFormProps) {
  const isEdit = !!lead;
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { activeDivision } = useDivision();

  const form = useForm<LeadCreate | LeadUpdate>({
    resolver: zodResolver(isEdit ? leadUpdateSchema : leadCreateSchema),
    defaultValues: {
      company_name: lead?.company_name ?? '',
      division_id: lead?.division_id ?? activeDivision?.id ?? undefined,
      source_channel: lead?.source_channel ?? undefined,
      industry: lead?.industry ?? undefined,
      city: lead?.city ?? undefined,
      province: lead?.province ?? 'ON',
    },
  });

  const isPending = createLead.isPending || updateLead.isPending;

  function onSubmit(raw: LeadCreate | LeadUpdate) {
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
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Tim Hortons, Rogers"
                  {...field}
                  value={field.value ?? ''}
                />
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
                        {src.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
      </form>
    </Form>
  );
}

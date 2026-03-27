'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { BiddingOpportunity } from '@/hooks/useCRM';
import { BIDDING_SOURCES, BIDDING_STATUSES } from '@/lib/crm/bidding';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  source: z.enum(['merx', 'bids_tenders', 'manual', 'referral']).optional(),
  url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  deadline: z.string().optional(),
  estimated_value: z.string().optional(),
  status: z.enum(['new', 'reviewing', 'bidding', 'submitted', 'won', 'lost', 'expired']).optional(),
  division_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface BiddingFormProps {
  defaultValues?: Partial<BiddingOpportunity>;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

function formatSourceLabel(s: string): string {
  if (s === 'merx') return 'MERX';
  if (s === 'bids_tenders') return 'Bids & Tenders';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildPayload(data: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: data.title,
    source: data.source,
    status: data.status,
  };
  if (data.url) payload.url = data.url;
  if (data.deadline) payload.deadline = new Date(data.deadline).toISOString();
  if (data.estimated_value) payload.estimated_value = parseFloat(data.estimated_value);
  if (data.notes) payload.notes = data.notes;
  if (data.division_id) payload.division_id = data.division_id;
  return payload;
}

function formatDeadline(deadline?: string | null): string {
  return deadline ? new Date(deadline).toISOString().slice(0, 16) : '';
}

function buildFormDefaults(d?: Partial<BiddingOpportunity>) {
  return {
    title: d?.title ?? '',
    source: (d?.source ?? 'manual') as FormData['source'],
    url: d?.url ?? '',
    deadline: formatDeadline(d?.deadline),
    estimated_value: d?.estimated_value?.toString() ?? '',
    status: (d?.status ?? 'new') as FormData['status'],
    notes: d?.notes ?? '',
  };
}

type FormMethods = ReturnType<typeof useForm<FormData>>;

function BiddingFormFields({
  register,
  watch,
  setValue,
  errors,
}: {
  register: FormMethods['register'];
  watch: FormMethods['watch'];
  setValue: FormMethods['setValue'];
  errors: FormMethods['formState']['errors'];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" {...register('title')} placeholder="Bid title" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            value={watch('source')}
            onValueChange={(v) => setValue('source', v as FormData['source'])}
          >
            <SelectTrigger id="source">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {BIDDING_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatSourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch('status')}
            onValueChange={(v) => setValue('status', v as FormData['status'])}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {BIDDING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" type="datetime-local" {...register('deadline')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_value">Estimated Value (CAD)</Label>
          <Input
            id="estimated_value"
            type="number"
            step="0.01"
            min="0"
            {...register('estimated_value')}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input id="url" {...register('url')} placeholder="https://..." />
        {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register('notes')} rows={3} />
      </div>
    </>
  );
}

export function BiddingForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save',
}: BiddingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: buildFormDefaults(defaultValues),
  });
  return (
    <form onSubmit={handleSubmit((data) => onSubmit(buildPayload(data)))} className="space-y-4">
      <BiddingFormFields register={register} watch={watch} setValue={setValue} errors={errors} />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}

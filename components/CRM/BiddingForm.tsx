'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BIDDING_SOURCES, BIDDING_STATUSES } from '@/lib/crm/bidding';
import type { BiddingOpportunity } from '@/hooks/useCRM';

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
    defaultValues: {
      title: defaultValues?.title ?? '',
      source: defaultValues?.source ?? 'manual',
      url: defaultValues?.url ?? '',
      deadline: defaultValues?.deadline
        ? new Date(defaultValues.deadline).toISOString().slice(0, 16)
        : '',
      estimated_value: defaultValues?.estimated_value?.toString() ?? '',
      status: defaultValues?.status ?? 'new',
      notes: defaultValues?.notes ?? '',
    },
  });

  const handleFormSubmit = (data: FormData) => {
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
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" {...register('title')} placeholder="Bid title" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            // eslint-disable-next-line react-hooks/incompatible-library
            value={watch('source')}
            onValueChange={(v) => setValue('source', v as FormData['source'])}
          >
            <SelectTrigger id="source">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {BIDDING_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'merx'
                    ? 'MERX'
                    : s === 'bids_tenders'
                      ? 'Bids & Tenders'
                      : s.charAt(0).toUpperCase() + s.slice(1)}
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

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}

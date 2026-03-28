'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

interface Submittal {
  id: string;
  project_id: string;
  submittal_type: string;
  title: string;
  description: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revise_resubmit';
  revision_no: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ApiResponse {
  data: Submittal[];
  total: number;
}

const SUBMITTAL_TYPES = [
  { value: 'shop_drawing', label: 'Shop Drawing' },
  { value: 'product_data', label: 'Product Data' },
  { value: 'sample', label: 'Sample' },
  { value: 'rfi', label: 'RFI' },
  { value: 'other', label: 'Other' },
] as const;

const submittalSchema = z.object({
  project_id: z.string().uuid('Must be a valid Project UUID'),
  submittal_type: z.enum(['shop_drawing', 'product_data', 'sample', 'rfi', 'other']),
  title: z.string().min(1, 'Required').max(200),
  description: z.string().max(2000).optional(),
});

type SubmittalForm = z.infer<typeof submittalSchema>;

const STATUS_MAP: Record<Submittal['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  revise_resubmit: {
    label: 'Revise & Resubmit',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
};

function SubmittalCard({ submittal }: { submittal: Submittal }) {
  const { label, className } = STATUS_MAP[submittal.status] ?? STATUS_MAP.draft;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{submittal.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="capitalize">{submittal.submittal_type.replace(/_/g, ' ')}</span>{' '}
            &middot; Rev {submittal.revision_no}
          </p>
        </div>
        <Badge className={`text-xs border shrink-0 ${className}`}>{label}</Badge>
      </div>
      {submittal.description && (
        <p className="text-xs text-gray-500 line-clamp-2">{submittal.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-1 flex-wrap">
        {submittal.submitted_at && (
          <span>
            Submitted:{' '}
            {new Date(submittal.submitted_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
          </span>
        )}
        {submittal.reviewed_at && (
          <span>
            Reviewed:{' '}
            {new Date(submittal.reviewed_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
          </span>
        )}
      </div>
    </div>
  );
}

function SubmittalsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

function NewSubmittalDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubmittalForm>({ resolver: zodResolver(submittalSchema) });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedType = watch('submittal_type');

  const mutation = useMutation({
    mutationFn: async (values: SubmittalForm) => {
      const res = await fetch('/api/portal/trade/submittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to create submittal');
      }
    },
    onSuccess: () => {
      reset();
      setOpen(false);
      onSuccess();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          New Submittal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Submittal</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="s_project_id">Project ID (UUID)</Label>
            <Input
              id="s_project_id"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              {...register('project_id')}
            />
            {errors.project_id && (
              <p className="text-xs text-red-600">{errors.project_id.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="s_type">Submittal Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) =>
                setValue('submittal_type', v as SubmittalForm['submittal_type'], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="s_type">
                <SelectValue placeholder="Select type…" />
              </SelectTrigger>
              <SelectContent>
                {SUBMITTAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.submittal_type && (
              <p className="text-xs text-red-600">{errors.submittal_type.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="s_title">Title</Label>
            <Input id="s_title" placeholder="Submittal title…" {...register('title')} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="s_description">Description (optional)</Label>
            <Textarea
              id="s_description"
              rows={3}
              placeholder="Additional details…"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description.message}</p>
            )}
          </div>
          {mutation.error && (
            <p className="text-xs text-red-600" role="alert">
              {(mutation.error as Error).message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create Submittal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TradeSubmittalsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ['portal-trade-submittals'],
    queryFn: async () => {
      const res = await fetch('/api/portal/trade/submittals');
      if (!res.ok) throw new Error('Failed to load submittals');
      return res.json() as Promise<ApiResponse>;
    },
  });

  const submittals = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Submittals</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Shop drawings, samples, and product data under review
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="text-sm text-gray-500">
              {total} submittal{total !== 1 ? 's' : ''}
            </span>
          )}
          <NewSubmittalDialog
            onSuccess={() =>
              queryClient.invalidateQueries({ queryKey: ['portal-trade-submittals'] })
            }
          />
        </div>
      </div>

      {isError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3"
          role="alert"
        >
          <p className="text-sm text-red-700">Failed to load submittals.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <SubmittalsSkeleton />
      ) : submittals.length === 0 && !isError ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-3">
          <ClipboardList className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm">No submittals on file yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submittals.map((submittal) => (
            <SubmittalCard key={submittal.id} submittal={submittal} />
          ))}
        </div>
      )}
    </div>
  );
}

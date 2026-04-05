'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus, RefreshCw } from 'lucide-react';
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

interface PortalProject {
  id: string;
  project_name: string;
  project_number: string | null;
}

interface PortalProjectsResponse {
  projects: PortalProject[];
}

interface Bid {
  id: string;
  opportunity_id: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected';
  total_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  data: Bid[];
  total: number;
}

const bidSchema = z.object({
  project_id: z.string().uuid('Must be a valid Project UUID'),
  bid_amount: z.number().positive('Must be positive'),
  scope_summary: z.string().min(10, 'At least 10 characters').max(2000),
  notes: z.string().optional(),
});

type BidForm = z.infer<typeof bidSchema>;

const STATUS_MAP: Record<Bid['status'], { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
};

function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

function BidCard({ bid }: { bid: Bid }) {
  const { label, className } = STATUS_MAP[bid.status] ?? STATUS_MAP.submitted;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            Opportunity{' '}
            <span className="font-mono text-gray-500 text-xs">
              #{bid.opportunity_id.slice(0, 8)}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Submitted{' '}
            {new Date(bid.created_at).toLocaleDateString('en-CA', { dateStyle: 'medium' })}
          </p>
        </div>
        <Badge className={`text-xs border shrink-0 ${className}`}>{label}</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
        <span className="text-lg font-bold text-orange-600">
          {bid.total_amount != null ? formatCAD(bid.total_amount) : '—'}
        </span>
        {bid.notes && <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{bid.notes}</p>}
      </div>
    </div>
  );
}

function BidsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
function NewBidDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);

  const { data: projectsData, isLoading: projectsLoading } = useQuery<PortalProjectsResponse>({
    queryKey: ['portal-projects'],
    queryFn: async () => {
      const res = await fetch('/api/portal/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      return res.json() as Promise<PortalProjectsResponse>;
    },
    enabled: open,
  });

  const projects = projectsData?.projects ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BidForm>({ resolver: zodResolver(bidSchema) });

  const mutation = useMutation({
    mutationFn: async (values: BidForm) => {
      const res = await fetch('/api/portal/trade/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to submit bid');
      }
    },
    onSuccess: () => {
      reset();
      setOpen(false);
      onSuccess();
    },
  });

  const submitDisabled = mutation.isPending || projectsLoading || projects.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          New Bid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a Bid</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
          noValidate
        >
          <div className="space-y-1">
            <Label htmlFor="project_id">Project</Label>
            {projectsLoading ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <Select
                onValueChange={(value) => setValue('project_id', value, { shouldValidate: true })}
              >
                <SelectTrigger id="project_id">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_number
                        ? `#${project.project_number} — ${project.project_name}`
                        : project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.project_id && (
              <p className="text-xs text-red-600">{errors.project_id.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="bid_amount">Bid Amount (CAD)</Label>
            <Input
              id="bid_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('bid_amount', { valueAsNumber: true })}
            />
            {errors.bid_amount && (
              <p className="text-xs text-red-600">{errors.bid_amount.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="scope_summary">Scope Summary</Label>
            <Textarea
              id="scope_summary"
              rows={4}
              placeholder="Describe the scope of work covered by this bid…"
              {...register('scope_summary')}
            />
            {errors.scope_summary && (
              <p className="text-xs text-red-600">{errors.scope_summary.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Any additional notes…"
              {...register('notes')}
            />
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
            <Button type="submit" disabled={submitDisabled}>
              {mutation.isPending ? 'Submitting…' : 'Submit Bid'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TradeBidsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<ApiResponse>({
    queryKey: ['portal-trade-bids'],
    queryFn: async () => {
      const res = await fetch('/api/portal/trade/bids');
      if (!res.ok) throw new Error('Failed to load bids');
      return res.json() as Promise<ApiResponse>;
    },
  });

  const bids = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bid Opportunities</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Track your submitted bids and their review status
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && (
            <span className="text-sm text-gray-500">
              {total} bid{total !== 1 ? 's' : ''}
            </span>
          )}
          <NewBidDialog
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['portal-trade-bids'] })}
          />
        </div>
      </div>

      {isError && (
        <div
          className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3"
          role="alert"
        >
          <p className="text-sm text-red-700">Failed to load bids.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <BidsSkeleton />
      ) : bids.length === 0 && !isError ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-3">
          <Briefcase className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm">No bids submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bids.map((bid) => (
            <BidCard key={bid.id} bid={bid} />
          ))}
        </div>
      )}
    </div>
  );
}

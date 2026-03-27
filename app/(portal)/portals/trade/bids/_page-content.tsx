'use client';

import { useQuery } from '@tanstack/react-query';
import { Briefcase, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function TradeBidsPage() {
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
        {!isLoading && (
          <span className="text-sm text-gray-500">
            {total} bid{total !== 1 ? 's' : ''}
          </span>
        )}
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

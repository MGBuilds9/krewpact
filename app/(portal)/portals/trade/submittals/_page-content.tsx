'use client';

import { useQuery } from '@tanstack/react-query';
import { ClipboardList, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function TradeSubmittalsPage() {
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
        {!isLoading && (
          <span className="text-sm text-gray-500">
            {total} submittal{total !== 1 ? 's' : ''}
          </span>
        )}
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/date';

interface ChangeOrder {
  id: string;
  co_number: string;
  title: string;
  description: string | null;
  status: string;
  total_amount: number;
  submitted_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

interface COApprovalCardProps {
  co: ChangeOrder;
  canApprove: boolean;
  projectId: string;
}

function COApprovalCard({ co, canApprove, projectId }: COApprovalCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleApprove = async () => {
    if (
      !confirm(
        `Approve Change Order "${co.title}" for $${co.total_amount.toLocaleString('en-CA')}?`,
      )
    )
      return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/projects/${projectId}/change-orders/${co.id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to approve');
      }
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const STATUS_STYLE: Record<string, string> = {
    pending_client_approval: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-mono">{co.co_number}</p>
          <h3 className="font-semibold text-gray-900 truncate mt-0.5">{co.title}</h3>
          {co.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{co.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[co.status] ?? 'bg-gray-100 text-gray-500'}`}
        >
          {co.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Amount</p>
          <p className="font-semibold text-gray-900">
            ${co.total_amount.toLocaleString('en-CA')} CAD
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Submitted</p>
          <p className="text-sm text-gray-600">{formatDate(co.submitted_at)}</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {co.status === 'pending_client_approval' && canApprove && (
        <button
          onClick={handleApprove}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Approving…' : 'Approve Change Order'}
        </button>
      )}
    </div>
  );
}

interface Props {
  changeOrders: ChangeOrder[];
  canApprove: boolean;
  projectId: string;
}

export default function ChangeOrdersTab({ changeOrders, canApprove, projectId }: Props) {
  if (changeOrders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-3">📋</p>
        <p className="text-sm">No change orders have been issued for this project yet.</p>
      </div>
    );
  }

  const pending = changeOrders.filter((co) => co.status === 'pending_client_approval');
  const resolved = changeOrders.filter((co) => co.status !== 'pending_client_approval');

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Pending Your Approval ({pending.length})
          </h3>
          <div className="grid gap-4">
            {pending.map((co) => (
              <COApprovalCard key={co.id} co={co} canApprove={canApprove} projectId={projectId} />
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Previous Change Orders</h3>
          <div className="grid gap-4">
            {resolved.map((co) => (
              <COApprovalCard key={co.id} co={co} canApprove={false} projectId={projectId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

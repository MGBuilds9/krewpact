'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PO_STATUS_COLORS: Record<string, string> = {
  draft:
    'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600',
  submitted:
    'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
  approved:
    'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
  ordered:
    'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700',
  partial_received:
    'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700',
  received:
    'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700',
  cancelled:
    'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
};

const PO_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  ordered: 'Ordered',
  partial_received: 'Partially Received',
  received: 'Fully Received',
  cancelled: 'Cancelled',
};

interface PoStatusBadgeProps {
  status: string;
}

export function PoStatusBadge({ status }: PoStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('border', PO_STATUS_COLORS[status] ?? '')}>
      {PO_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

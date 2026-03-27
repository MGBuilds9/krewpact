/**
 * Bidding opportunity business logic — status transitions, deadline alerts, validation.
 */

export const BIDDING_STATUSES = [
  'new',
  'reviewing',
  'bidding',
  'submitted',
  'won',
  'lost',
  'expired',
] as const;
export type BiddingStatus = (typeof BIDDING_STATUSES)[number];

export const BIDDING_SOURCES = ['merx', 'bids_tenders', 'manual', 'referral'] as const;
export type BiddingSource = (typeof BIDDING_SOURCES)[number];

const VALID_TRANSITIONS: Record<BiddingStatus, BiddingStatus[]> = {
  new: ['reviewing', 'expired'],
  reviewing: ['bidding', 'expired', 'lost'],
  bidding: ['submitted', 'expired', 'lost'],
  submitted: ['won', 'lost', 'expired'],
  won: [],
  lost: [],
  expired: [],
};

export function isValidTransition(from: BiddingStatus, to: BiddingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(status: BiddingStatus): BiddingStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export interface DeadlineAlert {
  level: 'urgent' | 'warning' | 'normal' | 'expired';
  hoursRemaining: number;
  label: string;
}

export function getDeadlineAlert(
  deadline: string | null,
  now: Date = new Date(),
): DeadlineAlert | null {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return { level: 'expired', hoursRemaining: 0, label: 'Expired' };
  }
  if (hoursRemaining <= 24) {
    return { level: 'urgent', hoursRemaining, label: `${Math.round(hoursRemaining)}h remaining` };
  }
  if (hoursRemaining <= 72) {
    const days = Math.round(hoursRemaining / 24);
    return { level: 'warning', hoursRemaining, label: `${days}d remaining` };
  }

  const days = Math.round(hoursRemaining / 24);
  return { level: 'normal', hoursRemaining, label: `${days}d remaining` };
}

export function getStatusColor(status: BiddingStatus): string {
  const colors: Record<BiddingStatus, string> = {
    new: 'bg-blue-100 text-blue-800',
    reviewing: 'bg-yellow-100 text-yellow-800',
    bidding: 'bg-purple-100 text-purple-800',
    submitted: 'bg-indigo-100 text-indigo-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

export function getSourceLabel(source: BiddingSource): string {
  const labels: Record<BiddingSource, string> = {
    merx: 'MERX',
    bids_tenders: 'Bids & Tenders',
    manual: 'Manual',
    referral: 'Referral',
  };
  return labels[source] ?? source;
}

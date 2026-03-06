'use client';

import { Badge } from '@/components/ui/badge';
import { getStatusColor } from '@/lib/crm/bidding';
import type { BiddingOpportunity } from '@/hooks/useCRM';

interface BiddingStatusBadgeProps {
  status: BiddingOpportunity['status'];
}

export function BiddingStatusBadge({ status }: BiddingStatusBadgeProps) {
  return (
    <Badge variant="outline" className={getStatusColor(status)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

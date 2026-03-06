'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BiddingStatusBadge } from './BiddingStatusBadge';
import { getDeadlineAlert, getSourceLabel } from '@/lib/crm/bidding';
import { Clock, DollarSign, ExternalLink } from 'lucide-react';
import type { BiddingOpportunity } from '@/hooks/useCRM';

interface BiddingCardProps {
  bid: BiddingOpportunity;
  onClick?: () => void;
}

export function BiddingCard({ bid, onClick }: BiddingCardProps) {
  const deadlineAlert = getDeadlineAlert(bid.deadline);

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm line-clamp-2">{bid.title}</h3>
          <BiddingStatusBadge status={bid.status} />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {getSourceLabel(bid.source)}
          </span>

          {bid.estimated_value != null && (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                maximumFractionDigits: 0,
              }).format(bid.estimated_value)}
            </span>
          )}

          {deadlineAlert && (
            <span
              className={`inline-flex items-center gap-1 ${
                deadlineAlert.level === 'urgent'
                  ? 'text-red-600 font-medium'
                  : deadlineAlert.level === 'warning'
                    ? 'text-yellow-600'
                    : deadlineAlert.level === 'expired'
                      ? 'text-gray-500 line-through'
                      : ''
              }`}
            >
              <Clock className="h-3 w-3" />
              {deadlineAlert.label}
            </span>
          )}

          {bid.url && (
            <a
              href={bid.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3" />
              Link
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Calendar, Percent } from 'lucide-react';
import type { Opportunity } from '@/hooks/useCRM';

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClick?: () => void;
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-3">
        <h4 className="font-medium text-sm truncate mb-1.5">{opportunity.opportunity_name}</h4>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(opportunity.estimated_revenue)}
          </span>
          {opportunity.probability_pct != null && (
            <span className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              {opportunity.probability_pct}%
            </span>
          )}
          {opportunity.target_close_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(opportunity.target_close_date).toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
        {opportunity.estimated_revenue != null && opportunity.probability_pct != null && (
          <p className="text-xs text-muted-foreground mt-1.5">
            weighted:{' '}
            {formatCurrency((opportunity.estimated_revenue * opportunity.probability_pct) / 100)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

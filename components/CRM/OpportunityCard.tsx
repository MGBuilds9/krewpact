'use client';

import { Calendar, DollarSign } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
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
    <Card
      className="group cursor-pointer bg-white dark:bg-card border shadow-sm hover:shadow-lg hover:scale-[1.02] hover:border-primary/20 transition-all duration-300 rounded-xl overflow-hidden relative"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight mb-2">
          {opportunity.opportunity_name}
        </h4>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <div className="p-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                <DollarSign className="h-3 w-3" />
              </div>
              {formatCurrency(opportunity.estimated_revenue)}
            </span>
            {opportunity.probability_pct != null && (
              <span className="font-bold text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                {opportunity.probability_pct}%
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            {opportunity.target_close_date ? (
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Calendar className="h-3 w-3" />
                {new Date(opportunity.target_close_date).toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            ) : (
              <span />
            )}

            {opportunity.estimated_revenue != null && opportunity.probability_pct != null && (
              <span className="text-muted-foreground font-semibold flex flex-col items-end">
                <span className="text-[9px] uppercase tracking-wider opacity-70">Weighted</span>
                {formatCurrency(
                  (opportunity.estimated_revenue * opportunity.probability_pct) / 100,
                )}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

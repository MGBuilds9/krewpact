'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SourceMetrics } from '@/lib/crm/metrics';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

interface LeadSourceBreakdownProps {
  metrics: SourceMetrics | undefined;
  isLoading?: boolean;
}

export function LeadSourceBreakdown({ metrics, isLoading }: LeadSourceBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !metrics || metrics.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No source data available</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
              <span>Source</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Value</span>
              <span className="text-right">Conv.</span>
            </div>
            {metrics.sources.map((source) => (
              <div key={source.source} className="grid grid-cols-4 gap-2 text-sm items-center">
                <span className="font-medium truncate">{source.source}</span>
                <span className="text-right text-muted-foreground">{source.count}</span>
                <span className="text-right text-muted-foreground">
                  {formatCurrency(source.value)}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <div className="h-2 w-12 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(source.conversionRate * 100, 100)}%` }}
                      role="progressbar"
                      aria-valuenow={source.conversionRate * 100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${source.source} conversion rate: ${formatPct(source.conversionRate)}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {formatPct(source.conversionRate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConversionMetrics } from '@/lib/crm/metrics';

interface ConversionFunnelProps {
  metrics: ConversionMetrics | undefined;
  isLoading?: boolean;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ConversionFunnel({ metrics, isLoading }: ConversionFunnelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const levels = metrics
    ? [
        { label: 'Total Leads', count: metrics.totalLeads, pct: 1 },
        {
          label: 'Qualified',
          count: metrics.qualifiedLeads,
          pct: metrics.qualificationRate,
        },
        {
          label: 'Converted',
          count: metrics.convertedLeads,
          pct: metrics.conversionRate,
        },
      ]
    : [];

  const maxCount = metrics?.totalLeads ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        {!metrics || metrics.totalLeads === 0 ? (
          <p className="text-sm text-muted-foreground">No lead data available</p>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {levels.map((level, i) => {
              const widthPct = Math.max(
                (level.count / maxCount) * 100,
                20,
              );
              const colors = [
                'bg-blue-500',
                'bg-amber-500',
                'bg-green-500',
              ];

              return (
                <div
                  key={level.label}
                  className="w-full text-center"
                  data-testid={`funnel-level-${i}`}
                >
                  <div
                    className={`mx-auto flex items-center justify-center rounded-sm py-2 text-sm font-medium text-white ${colors[i] ?? 'bg-gray-500'}`}
                    style={{ width: `${widthPct}%` }}
                    role="presentation"
                  >
                    {level.label}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {level.count} ({formatPct(level.pct)})
                  </p>
                </div>
              );
            })}
            {metrics.lostLeads > 0 && (
              <p className="text-xs text-muted-foreground">
                Lost: {metrics.lostLeads} ({formatPct(metrics.lossRate)})
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

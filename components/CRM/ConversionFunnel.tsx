'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ConversionMetrics } from '@/lib/crm/metrics';

interface ConversionFunnelProps {
  metrics: ConversionMetrics | undefined;
  isLoading?: boolean;
}

function ChartSkeleton() {
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

const ConversionFunnelChart = dynamic(
  () => import('./ConversionFunnelChart').then((m) => m.ConversionFunnelChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function ConversionFunnel({ metrics, isLoading }: ConversionFunnelProps) {
  if (isLoading) return <ChartSkeleton />;

  if (!metrics || metrics.totalLeads === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No lead data available</p>
        </CardContent>
      </Card>
    );
  }

  return <ConversionFunnelChart metrics={metrics} />;
}

'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SourceMetrics } from '@/lib/crm/metrics';

interface LeadSourceBreakdownProps {
  metrics: SourceMetrics | undefined;
  isLoading?: boolean;
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const LeadSourceBreakdownChart = dynamic(
  () => import('./LeadSourceBreakdownChart').then((m) => m.LeadSourceBreakdownChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function LeadSourceBreakdown({ metrics, isLoading }: LeadSourceBreakdownProps) {
  if (isLoading) return <ChartSkeleton />;

  if (!metrics || metrics.sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No source data available</p>
        </CardContent>
      </Card>
    );
  }

  return <LeadSourceBreakdownChart metrics={metrics} />;
}

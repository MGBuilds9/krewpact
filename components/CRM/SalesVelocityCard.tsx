'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VelocityMetrics } from '@/lib/crm/metrics';

interface SalesVelocityCardProps {
  metrics: VelocityMetrics | undefined;
  isLoading?: boolean;
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Velocity</CardTitle>
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

const SalesVelocityChartInner = dynamic(
  () => import('./SalesVelocityChartInner').then((m) => m.SalesVelocityChartInner),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function SalesVelocityCard({ metrics, isLoading }: SalesVelocityCardProps) {
  if (isLoading) return <ChartSkeleton />;

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No velocity data available</p>
        </CardContent>
      </Card>
    );
  }

  return <SalesVelocityChartInner metrics={metrics} />;
}

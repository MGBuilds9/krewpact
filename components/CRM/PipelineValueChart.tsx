'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineMetrics } from '@/lib/crm/metrics';

interface PipelineValueChartProps {
  metrics: PipelineMetrics | undefined;
  isLoading?: boolean;
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const PipelineValueChartInner = dynamic(
  () => import('./PipelineValueChartInner').then((m) => m.PipelineValueChartInner),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export function PipelineValueChart({ metrics, isLoading }: PipelineValueChartProps) {
  if (isLoading) return <ChartSkeleton />;

  const chartData = (metrics?.stageBreakdown ?? [])
    .filter((s) => s.count > 0)
    .map((stage) => ({
      stage: stage.stage,
      value: stage.value,
      weightedValue: stage.weightedValue,
      count: stage.count,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pipeline data available</p>
        </CardContent>
      </Card>
    );
  }

  return <PipelineValueChartInner chartData={chartData} />;
}

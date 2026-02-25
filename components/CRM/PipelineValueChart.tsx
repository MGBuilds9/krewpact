'use client';

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { PipelineMetrics } from '@/lib/crm/metrics';

const STAGE_LABELS: Record<string, string> = {
  intake: 'Intake',
  site_visit: 'Site Visit',
  estimating: 'Estimating',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  contracted: 'Contracted',
};

const chartConfig = {
  value: {
    label: 'Pipeline Value',
    color: 'hsl(210, 80%, 55%)',
  },
  weightedValue: {
    label: 'Weighted Value',
    color: 'hsl(140, 70%, 45%)',
  },
} satisfies ChartConfig;

interface PipelineValueChartProps {
  metrics: PipelineMetrics | undefined;
  isLoading?: boolean;
}

export function PipelineValueChart({ metrics, isLoading }: PipelineValueChartProps) {
  if (isLoading) {
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

  const chartData = (metrics?.stageBreakdown ?? [])
    .filter((s) => s.count > 0)
    .map((stage) => ({
      stage: STAGE_LABELS[stage.stage] ?? stage.stage,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <YAxis
              dataKey="stage"
              type="category"
              width={90}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const formatted = new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                      maximumFractionDigits: 0,
                    }).format(value as number);
                    return (
                      <span>
                        {name === 'value' ? 'Total' : 'Weighted'}: {formatted}
                      </span>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              fill="var(--color-value)"
              fillOpacity={0.8}
            />
            <Bar
              dataKey="weightedValue"
              radius={[0, 4, 4, 0]}
              fill="var(--color-weightedValue)"
              fillOpacity={0.6}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

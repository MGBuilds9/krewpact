'use client';

import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { VelocityMetrics } from '@/lib/crm/metrics';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const STAGE_LABELS: Record<string, string> = {
  intake: 'Intake',
  site_visit: 'Site Visit',
  estimating: 'Estimating',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
};

const chartConfig = {
  days: {
    label: 'Days in Stage',
    color: 'hsl(270, 70%, 55%)',
  },
} satisfies ChartConfig;

interface SalesVelocityCardProps {
  metrics: VelocityMetrics | undefined;
  isLoading?: boolean;
}

export function SalesVelocityCard({ metrics, isLoading }: SalesVelocityCardProps) {
  if (isLoading) {
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

  const stageData = Object.entries(metrics.averageDaysInStage).map(([stage, days]) => ({
    stage: STAGE_LABELS[stage] ?? stage,
    days,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center mb-6">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-2xl font-bold">{metrics.averageDaysToClose}</p>
            <p className="text-xs text-muted-foreground">Avg Days to Close</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-2xl font-bold">{metrics.dealsClosed}</p>
            <p className="text-xs text-muted-foreground">Deals Won</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.dealsClosedValue)}</p>
            <p className="text-xs text-muted-foreground">Value Won</p>
          </div>
        </div>

        {stageData.length > 0 && (
          <>
            <p className="mb-3 text-sm font-medium">Average Days per Stage</p>
            <ChartContainer config={chartConfig} className="aspect-auto h-[160px] w-full">
              <BarChart
                data={stageData}
                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}d`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => <span>{value} days</span>}
                    />
                  }
                />
                <Bar
                  dataKey="days"
                  fill="var(--color-days)"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.8}
                />
              </BarChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

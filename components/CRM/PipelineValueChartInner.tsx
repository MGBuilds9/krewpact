'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

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

interface PipelineValueChartInnerProps {
  chartData: Array<{
    stage: string;
    value: number;
    weightedValue: number;
    count: number;
  }>;
}

export function PipelineValueChartInner({ chartData }: PipelineValueChartInnerProps) {
  const labeled = chartData.map((d) => ({
    ...d,
    stage: STAGE_LABELS[d.stage] ?? d.stage,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart
            data={labeled}
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

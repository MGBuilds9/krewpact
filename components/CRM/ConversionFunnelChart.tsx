'use client';

import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ConversionMetrics } from '@/lib/crm/metrics';

const chartConfig = {
  count: {
    label: 'Count',
    color: 'hsl(210, 80%, 55%)',
  },
} satisfies ChartConfig;

const FUNNEL_COLORS = ['hsl(210, 80%, 55%)', 'hsl(40, 90%, 55%)', 'hsl(140, 70%, 45%)'];

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface ConversionFunnelChartProps {
  metrics: ConversionMetrics;
}

export function ConversionFunnelChart({ metrics }: ConversionFunnelChartProps) {
  const chartData = [
    { stage: 'Total Leads', count: metrics.totalLeads, pct: 1 },
    { stage: 'Qualified', count: metrics.qualifiedLeads, pct: metrics.qualificationRate },
    { stage: 'Converted', count: metrics.convertedLeads, pct: metrics.conversionRate },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
          >
            <YAxis
              dataKey="stage"
              type="category"
              width={85}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const pct = item?.payload?.pct;
                    return (
                      <span>
                        {value} leads ({formatPct(pct ?? 0)})
                      </span>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={36}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={FUNNEL_COLORS[index]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        {metrics.lostLeads > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Lost: {metrics.lostLeads} ({formatPct(metrics.lossRate)})
          </p>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { SourceMetrics } from '@/lib/crm/metrics';

const SOURCE_COLORS = [
  'hsl(210, 80%, 55%)',
  'hsl(140, 70%, 45%)',
  'hsl(40, 90%, 55%)',
  'hsl(25, 90%, 55%)',
  'hsl(270, 70%, 55%)',
  'hsl(190, 80%, 50%)',
  'hsl(340, 75%, 55%)',
  'hsl(0, 0%, 55%)',
];

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

interface LeadSourceBreakdownChartProps {
  metrics: SourceMetrics;
}

export function LeadSourceBreakdownChart({ metrics }: LeadSourceBreakdownChartProps) {
  const chartData = metrics.sources.map((s, i) => ({
    name: s.source,
    value: s.count,
    totalValue: s.value,
    conversionRate: s.conversionRate,
    fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  const chartCfg: ChartConfig = {};
  for (const item of chartData) {
    chartCfg[item.name] = {
      label: item.name,
      color: item.fill,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartCfg} className="aspect-square h-[280px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const data = item?.payload;
                    return (
                      <span>
                        {value} leads &middot; {formatCurrency(data?.totalValue ?? 0)} &middot;
                        Conv: {formatPct(data?.conversionRate ?? 0)}
                      </span>
                    );
                  }}
                  nameKey="name"
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey="name"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  payload={undefined as any}
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import { Cell, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { SourceCategory } from '@/lib/crm/constants';
import type { SourceMetrics } from '@/lib/crm/metrics';
import { formatStatus } from '@/lib/format-status';

const CATEGORY_PALETTES: Record<SourceCategory, string[]> = {
  inbound: ['hsl(210, 80%, 55%)', 'hsl(210, 70%, 65%)', 'hsl(200, 75%, 50%)', 'hsl(220, 70%, 60%)'],
  outbound: [
    'hsl(25, 90%, 55%)',
    'hsl(35, 85%, 55%)',
    'hsl(15, 85%, 50%)',
    'hsl(40, 80%, 50%)',
    'hsl(10, 75%, 55%)',
    'hsl(45, 80%, 55%)',
  ],
  other: ['hsl(0, 0%, 55%)', 'hsl(0, 0%, 65%)', 'hsl(0, 0%, 45%)'],
};

function getColorForSource(category: SourceCategory, indexInCategory: number): string {
  const palette = CATEGORY_PALETTES[category];
  return palette[indexInCategory % palette.length];
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function formatLabel(category: SourceCategory): string {
  return category === 'inbound' ? 'Inbound' : category === 'outbound' ? 'Outbound' : 'Other';
}

interface LeadSourceBreakdownChartProps {
  metrics: SourceMetrics;
}

export function LeadSourceBreakdownChart({ metrics }: LeadSourceBreakdownChartProps) {
  const categoryCounters: Record<SourceCategory, number> = { inbound: 0, outbound: 0, other: 0 };

  const chartData = metrics.sources.map((s) => {
    const cat = s.category;
    const color = getColorForSource(cat, categoryCounters[cat]);
    categoryCounters[cat]++;
    return {
      name: s.source,
      value: s.count,
      totalValue: s.value,
      conversionRate: s.conversionRate,
      category: cat,
      fill: color,
    };
  });

  const chartCfg: ChartConfig = {};
  for (const item of chartData) {
    chartCfg[item.name] = {
      label: `${formatStatus(item.name)} (${formatLabel(item.category)})`,
      color: item.fill,
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <ChartContainer config={chartCfg} className="aspect-square h-[280px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    const data = item?.payload;
                    return (
                      <span>
                        {value} leads &middot; {formatLabel(data?.category ?? 'other')} &middot;
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
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey="name"
                  className="flex-wrap"
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

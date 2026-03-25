'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface PipelineChartProps {
  data: PipelineStage[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}


const STAGE_COLORS: Record<string, string> = {
  qualification: 'bg-blue-500',
  proposal: 'bg-indigo-500',
  negotiation: 'bg-purple-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-500',
};

export function PipelineChart({ data }: PipelineChartProps) {
  if (data.length === 0) {
    return (
      <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No pipeline data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((stage) => {
          const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const colorClass = STAGE_COLORS[stage.stage] || 'bg-gray-500';

          return (
            <div key={stage.stage} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{formatStatus(stage.stage)}</span>
                <span className="text-muted-foreground">{stage.count} deals</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', colorClass)}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-24 text-right">
                  {formatCurrency(stage.value)}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

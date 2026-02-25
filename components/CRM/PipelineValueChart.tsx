'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PipelineMetrics } from '@/lib/crm/metrics';

const STAGE_COLORS: Record<string, string> = {
  intake: 'bg-blue-500',
  site_visit: 'bg-cyan-500',
  estimating: 'bg-amber-500',
  proposal: 'bg-orange-500',
  negotiation: 'bg-purple-500',
  contracted: 'bg-green-500',
};

const STAGE_LABELS: Record<string, string> = {
  intake: 'Intake',
  site_visit: 'Site Visit',
  estimating: 'Estimating',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  contracted: 'Contracted',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface PipelineValueChartProps {
  metrics: PipelineMetrics | undefined;
  isLoading?: boolean;
}

export function PipelineValueChart({ metrics, isLoading }: PipelineValueChartProps) {
  const maxValue = metrics
    ? Math.max(...metrics.stageBreakdown.map((s) => s.value), 1)
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !metrics || metrics.stageBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pipeline data available</p>
        ) : (
          <div className="space-y-3">
            {metrics.stageBreakdown
              .filter((s) => s.count > 0)
              .map((stage) => {
                const widthPct = Math.max((stage.value / maxValue) * 100, 2);
                const color = STAGE_COLORS[stage.stage] ?? 'bg-gray-500';
                const label = STAGE_LABELS[stage.stage] ?? stage.stage;

                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">
                        {stage.count} deal{stage.count !== 1 ? 's' : ''} &middot;{' '}
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                    <div className="h-6 w-full rounded-sm bg-muted">
                      <div
                        className={`h-full rounded-sm ${color} transition-all`}
                        style={{ width: `${widthPct}%` }}
                        role="progressbar"
                        aria-valuenow={stage.value}
                        aria-valuemin={0}
                        aria-valuemax={maxValue}
                        aria-label={`${label}: ${formatCurrency(stage.value)}`}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

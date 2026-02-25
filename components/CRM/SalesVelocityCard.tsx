'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface SalesVelocityCardProps {
  metrics: VelocityMetrics | undefined;
  isLoading?: boolean;
}

export function SalesVelocityCard({ metrics, isLoading }: SalesVelocityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Velocity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : !metrics ? (
          <p className="text-sm text-muted-foreground">No velocity data available</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{metrics.averageDaysToClose}</p>
                <p className="text-xs text-muted-foreground">Avg Days to Close</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.dealsClosed}</p>
                <p className="text-xs text-muted-foreground">Deals Won</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(metrics.dealsClosedValue)}</p>
                <p className="text-xs text-muted-foreground">Value Won</p>
              </div>
            </div>

            {Object.keys(metrics.averageDaysInStage).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Average Days per Stage</p>
                <div className="space-y-1">
                  {Object.entries(metrics.averageDaysInStage).map(([stage, days]) => (
                    <div key={stage} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {STAGE_LABELS[stage] ?? stage}
                      </span>
                      <span className="font-medium">{days}d</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardMetrics } from '@/hooks/useCRM';
import { PipelineValueChart } from '@/components/CRM/PipelineValueChart';
import { ConversionFunnel } from '@/components/CRM/ConversionFunnel';
import { SalesVelocityCard } from '@/components/CRM/SalesVelocityCard';
import { LeadSourceBreakdown } from '@/components/CRM/LeadSourceBreakdown';

const PERIODS = ['week', 'month', 'quarter', 'year'] as const;

const PERIOD_LABELS: Record<string, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CRMDashboardPage() {
  const [period, setPeriod] = useState<string>('month');
  const { data, isLoading } = useDashboardMetrics(undefined, period);

  return (
    <>
      <title>CRM Dashboard — KrewPact</title>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM Dashboard</h1>
        <div className="flex gap-1 rounded-lg border p-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Pipeline</p>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(data?.pipeline.totalPipelineValue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Weighted Pipeline</p>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(data?.pipeline.weightedPipelineValue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Avg Deal Size</p>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(data?.pipeline.averageDealSize ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Deals Won</p>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : (data?.velocity.dealsClosed ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Pipeline Chart + Conversion Funnel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineValueChart metrics={data?.pipeline} isLoading={isLoading} />
        </div>
        <div>
          <ConversionFunnel metrics={data?.conversion} isLoading={isLoading} />
        </div>
      </div>

      {/* Row 3: Velocity + Lead Sources */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SalesVelocityCard metrics={data?.velocity} isLoading={isLoading} />
        <LeadSourceBreakdown metrics={data?.sources} isLoading={isLoading} />
      </div>
    </div>
    </>
  );
}

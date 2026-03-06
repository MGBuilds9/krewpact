'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardMetrics, usePipelineIntelligence, useDivisionComparison } from '@/hooks/useCRM';
import { PipelineValueChart } from '@/components/CRM/PipelineValueChart';
import { ConversionFunnel } from '@/components/CRM/ConversionFunnel';
import { SalesVelocityCard } from '@/components/CRM/SalesVelocityCard';
import { LeadSourceBreakdown } from '@/components/CRM/LeadSourceBreakdown';
import { MyTasksWidget } from '@/components/CRM/MyTasksWidget';
import { RepPerformanceCard } from '@/components/CRM/RepPerformanceCard';
import { PipelineAgingCard } from '@/components/CRM/PipelineAgingCard';
import { WinLossAnalysis } from '@/components/CRM/WinLossAnalysis';
import { DivisionComparisonCard } from '@/components/CRM/DivisionComparisonCard';
import { SeasonalAnalysisCard } from '@/components/CRM/SeasonalAnalysisCard';

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
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [period, setPeriod] = useState<string>('month');
  const { data, isLoading } = useDashboardMetrics(undefined, period);
  const { data: intelligence, isLoading: intelLoading } = usePipelineIntelligence();
  const { data: divComparison } = useDivisionComparison();

  return (
    <>
      <title>CRM Dashboard — KrewPact</title>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        {/* Row 2: My Tasks + Pipeline Chart */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <MyTasksWidget orgSlug={orgSlug} />
          </div>
          <div className="lg:col-span-2">
            <PipelineValueChart metrics={data?.pipeline} isLoading={isLoading} />
          </div>
        </div>

        {/* Row 3: Conversion + Velocity + Sources */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ConversionFunnel metrics={data?.conversion} isLoading={isLoading} />
          <SalesVelocityCard metrics={data?.velocity} isLoading={isLoading} />
          <LeadSourceBreakdown metrics={data?.sources} isLoading={isLoading} />
        </div>

        {/* Row 4: Pipeline Intelligence */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RepPerformanceCard
            data={intelligence?.rep_performance ?? []}
            isLoading={intelLoading}
          />
          <PipelineAgingCard
            data={intelligence?.pipeline_aging ?? []}
            isLoading={intelLoading}
          />
        </div>

        {/* Row 5: Win/Loss Analysis */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WinLossAnalysis
            title="Win/Loss by Rep"
            data={intelligence?.win_loss_by_rep ?? []}
            isLoading={intelLoading}
          />
          <WinLossAnalysis
            title="Win/Loss by Division"
            data={intelligence?.win_loss_by_division ?? []}
            isLoading={intelLoading}
          />
        </div>
        {/* Row 6: Construction Intelligence */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DivisionComparisonCard
            divisions={divComparison?.division_comparison ?? []}
          />
          <SeasonalAnalysisCard
            quarters={divComparison?.seasonal_analysis ?? []}
          />
        </div>
      </div>
    </>
  );
}

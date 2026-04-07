'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ConversionFunnel } from '@/components/CRM/ConversionFunnel';
import { DivisionComparisonCard } from '@/components/CRM/DivisionComparisonCard';
import { LeadSourceBreakdown } from '@/components/CRM/LeadSourceBreakdown';
import { MyTasksWidget } from '@/components/CRM/MyTasksWidget';
import { PipelineAgingCard } from '@/components/CRM/PipelineAgingCard';
import { PipelineValueChart } from '@/components/CRM/PipelineValueChart';
import { RepPerformanceCard } from '@/components/CRM/RepPerformanceCard';
import { SalesVelocityCard } from '@/components/CRM/SalesVelocityCard';
import { SeasonalAnalysisCard } from '@/components/CRM/SeasonalAnalysisCard';
import { WinLossAnalysis } from '@/components/CRM/WinLossAnalysis';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDashboardMetrics,
  useDivisionComparison,
  usePipelineIntelligence,
} from '@/hooks/useCRM';
import { formatCurrency } from '@/lib/format/currency';

type DashboardData = NonNullable<ReturnType<typeof useDashboardMetrics>['data']>;
type IntelligenceData = NonNullable<ReturnType<typeof usePipelineIntelligence>['data']>;
type DivComparisonData = NonNullable<ReturnType<typeof useDivisionComparison>['data']>;

const PERIODS = ['week', 'month', 'quarter', 'year'] as const;
const PERIOD_LABELS: Record<string, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

const fmt = formatCurrency;

interface KPICardProps {
  label: string;
  value: string | number | undefined;
}
function KPICard({ label, value }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function PeriodToggle({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border p-1">
      {PERIODS.map((p) => (
        <Button
          key={p}
          variant={period === p ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(p)}
        >
          {PERIOD_LABELS[p]}
        </Button>
      ))}
    </div>
  );
}

interface KPIRowProps {
  data: DashboardData | undefined;
  isLoading: boolean;
}
function KPIRow({ data, isLoading }: KPIRowProps) {
  const p = data ? data.pipeline : null;
  const v = data ? data.velocity : null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Total Pipeline"
        value={isLoading ? undefined : fmt(p ? p.totalPipelineValue : 0)}
      />
      <KPICard
        label="Weighted Pipeline"
        value={isLoading ? undefined : fmt(p ? p.weightedPipelineValue : 0)}
      />
      <KPICard
        label="Avg Deal Size"
        value={isLoading ? undefined : fmt(p ? p.averageDealSize : 0)}
      />
      <KPICard label="Deals Won" value={isLoading ? undefined : v ? v.dealsClosed : 0} />
    </div>
  );
}

interface DashboardGridProps {
  orgSlug: string;
  data: DashboardData | undefined;
  intelligence: IntelligenceData | undefined;
  divComparison: DivComparisonData | undefined;
  isLoading: boolean;
  intelLoading: boolean;
}
function extractIntel(intelligence: IntelligenceData | undefined) {
  if (!intelligence) return { repPerf: [], pipelineAging: [], winLossByRep: [], winLossByDiv: [] };
  return {
    repPerf: intelligence.rep_performance || [],
    pipelineAging: intelligence.pipeline_aging || [],
    winLossByRep: intelligence.win_loss_by_rep || [],
    winLossByDiv: intelligence.win_loss_by_division || [],
  };
}

function DashboardGrid({
  orgSlug,
  data,
  intelligence,
  divComparison,
  isLoading,
  intelLoading,
}: DashboardGridProps) {
  const pipeline = data ? data.pipeline : undefined;
  const { repPerf, pipelineAging, winLossByRep, winLossByDiv } = extractIntel(intelligence);
  const divisionComparison = divComparison ? divComparison.division_comparison || [] : [];
  const seasonalAnalysis = divComparison ? divComparison.seasonal_analysis || [] : [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <MyTasksWidget orgSlug={orgSlug} />
        </div>
        <div className="lg:col-span-2">
          <PipelineValueChart metrics={pipeline as never} isLoading={isLoading} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ConversionFunnel
          metrics={data ? data.conversion : (undefined as never)}
          isLoading={isLoading}
        />
        <SalesVelocityCard
          metrics={data ? data.velocity : (undefined as never)}
          isLoading={isLoading}
        />
        <LeadSourceBreakdown
          metrics={data ? data.sources : (undefined as never)}
          isLoading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RepPerformanceCard data={repPerf as never} isLoading={intelLoading} />
        <PipelineAgingCard data={pipelineAging as never} isLoading={intelLoading} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WinLossAnalysis
          title="Win/Loss by Rep"
          data={winLossByRep as never}
          isLoading={intelLoading}
        />
        <WinLossAnalysis
          title="Win/Loss by Division"
          data={winLossByDiv as never}
          isLoading={intelLoading}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DivisionComparisonCard divisions={divisionComparison as never} />
        <SeasonalAnalysisCard quarters={seasonalAnalysis as never} />
      </div>
    </div>
  );
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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">CRM Dashboard</h1>
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
        <KPIRow data={data} isLoading={isLoading} />
        <DashboardGrid
          orgSlug={orgSlug}
          data={data}
          intelligence={intelligence}
          divComparison={divComparison}
          isLoading={isLoading}
          intelLoading={intelLoading}
        />
      </div>
    </>
  );
}

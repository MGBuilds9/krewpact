'use client';

import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { useMemo, useState } from 'react';

import { InsightAnalyticsCard } from '@/components/AI/InsightAnalyticsCard';
import type { Alert } from '@/components/Executive/AlertsRibbon';
import { AlertsRibbon } from '@/components/Executive/AlertsRibbon';
import { DivisionScorecard } from '@/components/Executive/DivisionScorecard';
import type { DivisionId } from '@/components/Executive/DivisionSelector';
import { DivisionSelector } from '@/components/Executive/DivisionSelector';
import type { ForecastQuarter } from '@/components/Executive/ForecastChart';
import { ForecastChart } from '@/components/Executive/ForecastChart';
import { MetricsGrid } from '@/components/Executive/MetricsGrid';
import { SubscriptionWidget } from '@/components/Executive/SubscriptionWidget';
import { apiFetch } from '@/lib/api-client';
import type {
  EstimatingVelocity,
  PipelineSummary,
  ProjectPortfolio,
  SubscriptionSummary,
} from '@/lib/executive/metrics';
import { queryKeys } from '@/lib/query-keys';

interface MetricEntry<T> {
  value: T;
  computed_at: string;
}
interface OverviewResponse {
  metrics: {
    pipeline_summary?: MetricEntry<PipelineSummary>;
    project_portfolio?: MetricEntry<ProjectPortfolio>;
    estimating_velocity?: MetricEntry<EstimatingVelocity>;
    subscription_summary?: MetricEntry<SubscriptionSummary>;
  };
}
interface AlertsResponse {
  alerts: Alert[];
}
interface ForecastResponse {
  forecast: ForecastQuarter[];
}

type MetricsResult = {
  pipeline: PipelineSummary | undefined;
  portfolio: ProjectPortfolio | undefined;
  estimating: EstimatingVelocity | undefined;
  subscriptions: SubscriptionSummary | undefined;
  computedAt: string | undefined;
};

function extractMetrics(data: OverviewResponse | undefined): MetricsResult {
  const metrics = data ? data.metrics || {} : {};
  return {
    pipeline: metrics.pipeline_summary ? metrics.pipeline_summary.value : undefined,
    portfolio: metrics.project_portfolio ? metrics.project_portfolio.value : undefined,
    estimating: metrics.estimating_velocity ? metrics.estimating_velocity.value : undefined,
    subscriptions: metrics.subscription_summary ? metrics.subscription_summary.value : undefined,
    computedAt: Object.values(metrics)
      .map((m) => (m ? m.computed_at : undefined))
      .filter(Boolean)
      .sort()
      .at(-1),
  };
}

interface DivPanelProps {
  label: string;
  color: string;
  metrics: MetricsResult;
  isLoading: boolean;
}
function DivPanel({ label, color, metrics, isLoading }: DivPanelProps) {
  return (
    <div className="space-y-4">
      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</p>
      <MetricsGrid
        pipeline={metrics.pipeline}
        portfolio={metrics.portfolio}
        estimating={metrics.estimating}
        subscriptions={metrics.subscriptions}
        isLoading={isLoading}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DivisionScorecard portfolio={metrics.portfolio} isLoading={isLoading} />
        <SubscriptionWidget summary={metrics.subscriptions} isLoading={isLoading} />
      </div>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
export default function ExecutiveOverviewPage() {
  const [selectedDivision, setSelectedDivision] = useState<DivisionId | null>(null);
  const [compareDivision, setCompareDivision] = useState<DivisionId | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  function handleToggleCompare() {
    setIsComparing((prev) => {
      if (prev) setCompareDivision(null);
      return !prev;
    });
  }

  const divQuery = selectedDivision
    ? `/api/executive/overview?division=${selectedDivision}`
    : '/api/executive/overview';
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: selectedDivision
      ? queryKeys.executive.overviewByDivision(selectedDivision)
      : queryKeys.executive.overview(),
    queryFn: () => apiFetch<OverviewResponse>(divQuery),
  });
  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: queryKeys.executive.overviewByDivision(compareDivision || '__none__'),
    queryFn: () =>
      apiFetch<OverviewResponse>(`/api/executive/overview?division=${compareDivision}`),
    enabled: isComparing && compareDivision !== null,
  });
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: queryKeys.executive.alerts(),
    queryFn: () => apiFetch<AlertsResponse>('/api/executive/alerts'),
    refetchInterval: 5 * 60 * 1000,
  });
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: queryKeys.executive.forecast(),
    queryFn: () => apiFetch<ForecastResponse>('/api/executive/forecast'),
  });

  const primary = useMemo(() => extractMetrics(overviewData), [overviewData]);
  const compare = useMemo(() => extractMetrics(compareData), [compareData]);
  const alerts = useMemo(() => alertsData?.alerts || [], [alertsData]);
  const forecast = useMemo(() => forecastData?.forecast, [forecastData]);
  const showComparison = isComparing && compareDivision !== null && compareData !== undefined;
  const showInsights = !showComparison && overviewData !== undefined;

  return (
    <>
      <title>Command Center — KrewPact</title>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Executive overview — MDM Group</p>
          </div>
          {primary.computedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Last updated{' '}
                {formatDistanceToNow(new Date(primary.computedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
        <DivisionSelector
          selectedDivision={selectedDivision}
          compareDivision={compareDivision}
          isComparing={isComparing}
          onSelectDivision={setSelectedDivision}
          onSelectCompareDivision={setCompareDivision}
          onToggleCompare={handleToggleCompare}
        />
        <AlertsRibbon alerts={alerts} isLoading={alertsLoading} />
        {showComparison ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DivPanel
              label={`Division A — ${selectedDivision}`}
              color="text-primary"
              metrics={primary}
              isLoading={overviewLoading}
            />
            <DivPanel
              label={`Division B — ${compareDivision}`}
              color="text-blue-500"
              metrics={compare}
              isLoading={compareLoading}
            />
          </div>
        ) : (
          <>
            <MetricsGrid
              pipeline={primary.pipeline}
              portfolio={primary.portfolio}
              estimating={primary.estimating}
              subscriptions={primary.subscriptions}
              isLoading={overviewLoading}
            />
            <ForecastChart forecast={forecast} isLoading={forecastLoading} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DivisionScorecard portfolio={primary.portfolio} isLoading={overviewLoading} />
              <SubscriptionWidget summary={primary.subscriptions} isLoading={overviewLoading} />
            </div>
            {showInsights && <InsightAnalyticsCard />}
          </>
        )}
      </div>
    </>
  );
}

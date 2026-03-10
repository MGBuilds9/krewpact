'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { AlertsRibbon } from '@/components/Executive/AlertsRibbon';
import { MetricsGrid } from '@/components/Executive/MetricsGrid';
import { DivisionScorecard } from '@/components/Executive/DivisionScorecard';
import { SubscriptionWidget } from '@/components/Executive/SubscriptionWidget';
import { ForecastChart } from '@/components/Executive/ForecastChart';
import { DivisionSelector } from '@/components/Executive/DivisionSelector';
import type { DivisionId } from '@/components/Executive/DivisionSelector';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type {
  PipelineSummary,
  ProjectPortfolio,
  EstimatingVelocity,
  SubscriptionSummary,
} from '@/lib/executive/metrics';
import type { Alert } from '@/components/Executive/AlertsRibbon';
import type { ForecastQuarter } from '@/components/Executive/ForecastChart';

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

function extractMetrics(data: OverviewResponse | undefined) {
  const metrics = data?.metrics ?? {};
  return {
    pipeline: metrics.pipeline_summary?.value,
    portfolio: metrics.project_portfolio?.value,
    estimating: metrics.estimating_velocity?.value,
    subscriptions: metrics.subscription_summary?.value,
    computedAt: Object.values(metrics)
      .map((m) => m?.computed_at)
      .filter(Boolean)
      .sort()
      .at(-1),
  };
}

export default function ExecutiveOverviewPage() {
  const [selectedDivision, setSelectedDivision] = useState<DivisionId | null>(null);
  const [compareDivision, setCompareDivision] = useState<DivisionId | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  function handleToggleCompare() {
    setIsComparing((prev) => {
      if (prev) {
        setCompareDivision(null);
      }
      return !prev;
    });
  }

  // Primary overview — org-wide when no division selected, or division-filtered
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: selectedDivision
      ? queryKeys.executive.overviewByDivision(selectedDivision)
      : queryKeys.executive.overview(),
    queryFn: () =>
      apiFetch<OverviewResponse>(
        selectedDivision
          ? `/api/executive/overview?division=${selectedDivision}`
          : '/api/executive/overview',
      ),
  });

  // Secondary overview — only when comparing with two divisions selected
  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: queryKeys.executive.overviewByDivision(compareDivision ?? '__none__'),
    queryFn: () =>
      apiFetch<OverviewResponse>(`/api/executive/overview?division=${compareDivision}`),
    enabled: isComparing && compareDivision !== null,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: queryKeys.executive.alerts(),
    queryFn: () => apiFetch<AlertsResponse>('/api/executive/alerts'),
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: queryKeys.executive.forecast(),
    queryFn: () => apiFetch<ForecastResponse>('/api/executive/forecast'),
  });

  const primary = extractMetrics(overviewData);
  const compare = extractMetrics(compareData);
  const alerts = alertsData?.alerts ?? [];
  const forecast = forecastData?.forecast;

  const showComparison = isComparing && compareDivision !== null && compareData !== undefined;

  return (
    <>
      <title>Command Center — KrewPact</title>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Page header */}
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

        {/* Division selector */}
        <DivisionSelector
          selectedDivision={selectedDivision}
          compareDivision={compareDivision}
          isComparing={isComparing}
          onSelectDivision={setSelectedDivision}
          onSelectCompareDivision={setCompareDivision}
          onToggleCompare={handleToggleCompare}
        />

        {/* Alerts ribbon — full width */}
        <AlertsRibbon alerts={alerts} isLoading={alertsLoading} />

        {/* Metrics — side-by-side when comparing, single column otherwise */}
        {showComparison ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Division A — {selectedDivision}
              </p>
              <MetricsGrid
                pipeline={primary.pipeline}
                portfolio={primary.portfolio}
                estimating={primary.estimating}
                subscriptions={primary.subscriptions}
                isLoading={overviewLoading}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DivisionScorecard portfolio={primary.portfolio} isLoading={overviewLoading} />
                <SubscriptionWidget summary={primary.subscriptions} isLoading={overviewLoading} />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                Division B — {compareDivision}
              </p>
              <MetricsGrid
                pipeline={compare.pipeline}
                portfolio={compare.portfolio}
                estimating={compare.estimating}
                subscriptions={compare.subscriptions}
                isLoading={compareLoading}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DivisionScorecard portfolio={compare.portfolio} isLoading={compareLoading} />
                <SubscriptionWidget summary={compare.subscriptions} isLoading={compareLoading} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Metrics grid — KPI row + stage/status breakdown */}
            <MetricsGrid
              pipeline={primary.pipeline}
              portfolio={primary.portfolio}
              estimating={primary.estimating}
              subscriptions={primary.subscriptions}
              isLoading={overviewLoading}
            />

            {/* Revenue Forecast — full width */}
            <ForecastChart forecast={forecast} isLoading={forecastLoading} />

            {/* Bottom row — division scorecard + subscription widget */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DivisionScorecard portfolio={primary.portfolio} isLoading={overviewLoading} />
              <SubscriptionWidget summary={primary.subscriptions} isLoading={overviewLoading} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { AlertsRibbon } from '@/components/Executive/AlertsRibbon';
import { MetricsGrid } from '@/components/Executive/MetricsGrid';
import { DivisionScorecard } from '@/components/Executive/DivisionScorecard';
import { SubscriptionWidget } from '@/components/Executive/SubscriptionWidget';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type {
  PipelineSummary,
  ProjectPortfolio,
  EstimatingVelocity,
  SubscriptionSummary,
} from '@/lib/executive/metrics';
import type { Alert } from '@/components/Executive/AlertsRibbon';

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

export default function ExecutiveOverviewPage() {
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: queryKeys.executive.overview(),
    queryFn: () => apiFetch<OverviewResponse>('/api/executive/overview'),
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: queryKeys.executive.alerts(),
    queryFn: () => apiFetch<AlertsResponse>('/api/executive/alerts'),
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const metrics = overviewData?.metrics ?? {};
  const pipeline = metrics.pipeline_summary?.value;
  const portfolio = metrics.project_portfolio?.value;
  const estimating = metrics.estimating_velocity?.value;
  const subscriptions = metrics.subscription_summary?.value;

  // Use the most recent computed_at from any metric
  const computedAt = Object.values(metrics)
    .map((m) => m?.computed_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  const alerts = alertsData?.alerts ?? [];

  return (
    <>
      <title>Command Center — KrewPact</title>
      <div className="space-y-6 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Executive overview — MDM Group</p>
          </div>
          {computedAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                Last updated {formatDistanceToNow(new Date(computedAt), { addSuffix: true })}
              </span>
            </div>
          )}
        </div>

        {/* Alerts ribbon — full width */}
        <AlertsRibbon alerts={alerts} isLoading={alertsLoading} />

        {/* Metrics grid — KPI row + stage/status breakdown */}
        <MetricsGrid
          pipeline={pipeline}
          portfolio={portfolio}
          estimating={estimating}
          subscriptions={subscriptions}
          isLoading={overviewLoading}
        />

        {/* Bottom row — division scorecard + subscription widget */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DivisionScorecard portfolio={portfolio} isLoading={overviewLoading} />
          <SubscriptionWidget summary={subscriptions} isLoading={overviewLoading} />
        </div>
      </div>
    </>
  );
}

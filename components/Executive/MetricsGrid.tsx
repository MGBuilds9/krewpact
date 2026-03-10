'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/Dashboard/KPICard';
import { DollarSign, FolderKanban, Target, CreditCard } from 'lucide-react';
import type {
  PipelineSummary,
  ProjectPortfolio,
  EstimatingVelocity,
  SubscriptionSummary,
} from '@/lib/executive/metrics';

interface MetricsGridProps {
  pipeline?: PipelineSummary;
  portfolio?: ProjectPortfolio;
  estimating?: EstimatingVelocity;
  subscriptions?: SubscriptionSummary;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 1,
      notation: 'compact',
      compactDisplay: 'short',
    }).format(value);
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

export function MetricsGrid({ pipeline, portfolio, subscriptions, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          label="Pipeline Value"
          value={pipeline ? formatCurrency(pipeline.totalValue) : '—'}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          label="Active Projects"
          value={portfolio ? String(portfolio.activeCount) : '—'}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <KPICard
          label="Win Rate"
          value={pipeline ? `${pipeline.winRate}%` : '—'}
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          label="Monthly SaaS"
          value={
            subscriptions
              ? new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                  maximumFractionDigits: 0,
                }).format(subscriptions.totalMonthlyCost)
              : '—'
          }
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      {/* Pipeline Stage Breakdown + Project Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pipeline Stages
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {pipeline && pipeline.stageBreakdown.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pipeline.stageBreakdown.map(({ stage, count, value }) => (
                  <div
                    key={stage}
                    className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5"
                  >
                    <Badge variant="secondary" className="text-xs">
                      {stageLabels[stage] ?? stage}
                    </Badge>
                    <span className="text-xs font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">({formatCurrency(value)})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pipeline data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {portfolio && portfolio.statusBreakdown.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {portfolio.statusBreakdown.map(({ status, count }) => (
                  <div
                    key={status}
                    className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5"
                  >
                    <Badge variant="outline" className="text-xs capitalize">
                      {status}
                    </Badge>
                    <span className="text-xs font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

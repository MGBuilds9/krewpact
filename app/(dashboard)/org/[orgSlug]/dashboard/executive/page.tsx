'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { KPICard } from '@/components/Dashboard/KPICard';
import { PipelineChart, PipelineStage } from '@/components/Dashboard/PipelineChart';
import { apiFetch } from '@/lib/api-client';
import { DollarSign, Briefcase, Target, TrendingUp } from 'lucide-react';
import { useUserRBAC } from '@/hooks/useRBAC';

interface ExecutiveDashboardData {
  kpis: {
    totalPipelineValue: number;
    activeProjects: number;
    winRate: number;
    avgDealSize: number;
    totalEstimates: number;
  };
  pipeline: PipelineStage[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export default function ExecutiveDashboardPage() {
  const { hasRole, isLoading: rbacLoading } = useUserRBAC();

  const { data, isLoading } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: () => apiFetch<ExecutiveDashboardData>('/api/dashboard/executive'),
    staleTime: 30_000,
    enabled: !rbacLoading,
  });

  const canView =
    hasRole('executive') || hasRole('platform_admin') || hasRole('CEO') || hasRole('IT_ADMIN');

  if (rbacLoading || isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">
          The executive dashboard is restricted to executive and admin roles.
        </p>
      </div>
    );
  }

  const kpis = data?.kpis;
  const pipeline = data?.pipeline ?? [];

  return (
    <>
      <title>Executive Dashboard — KrewPact</title>
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Total Pipeline Value"
            value={formatCurrency(kpis?.totalPipelineValue ?? 0)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            label="Active Projects"
            value={String(kpis?.activeProjects ?? 0)}
            icon={<Briefcase className="h-5 w-5" />}
          />
          <KPICard
            label="Win Rate"
            value={`${kpis?.winRate ?? 0}%`}
            icon={<Target className="h-5 w-5" />}
          />
          <KPICard
            label="Avg Deal Size"
            value={formatCurrency(kpis?.avgDealSize ?? 0)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>

        <PipelineChart data={pipeline} />
      </div>
    </>
  );
}

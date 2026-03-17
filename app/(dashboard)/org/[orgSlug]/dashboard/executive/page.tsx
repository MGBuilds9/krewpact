'use client';

import { useQuery } from '@tanstack/react-query';
import { Briefcase, DollarSign, Target, TrendingUp } from 'lucide-react';

import { KPICard } from '@/components/Dashboard/KPICard';
import { PipelineChart, PipelineStage } from '@/components/Dashboard/PipelineChart';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserRBAC } from '@/hooks/useRBAC';
import { apiFetch } from '@/lib/api-client';

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

const EXECUTIVE_ROLES = ['executive', 'platform_admin', 'CEO', 'IT_ADMIN'];

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function DashboardSkeleton() {
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

function KPIGrid({ kpis }: { kpis: ExecutiveDashboardData['kpis'] | undefined }) {
  return (
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
  );
}

export default function ExecutiveDashboardPage() {
  const { hasRole, isLoading: rbacLoading } = useUserRBAC();

  const { data, isLoading } = useQuery({
    queryKey: ['executive-dashboard'],
    queryFn: () => apiFetch<ExecutiveDashboardData>('/api/dashboard/executive'),
    staleTime: 30_000,
    enabled: !rbacLoading,
  });

  if (rbacLoading || isLoading) return <DashboardSkeleton />;

  const canView = EXECUTIVE_ROLES.some((r) => hasRole(r));
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

  return (
    <>
      <title>Executive Dashboard — KrewPact</title>
      <div className="space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        <KPIGrid kpis={data?.kpis} />
        <PipelineChart data={data?.pipeline ?? []} />
      </div>
    </>
  );
}

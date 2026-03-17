'use client';

import { Activity, DollarSign, Heart, TrendingUp, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAccountHealth } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';

const gradeColors: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700 border-green-200',
  good: 'bg-blue-100 text-blue-700 border-blue-200',
  fair: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  at_risk: 'bg-orange-100 text-orange-700 border-orange-200',
  inactive: 'bg-red-100 text-red-700 border-red-200',
};

const lifecycleColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  prospect: 'bg-blue-100 text-blue-700',
  active_client: 'bg-green-100 text-green-700',
  repeat_client: 'bg-purple-100 text-purple-700',
  churned: 'bg-red-100 text-red-700',
};

const lifecycleLabels: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospect',
  active_client: 'Active Client',
  repeat_client: 'Repeat Client',
  churned: 'Churned',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface AccountHealthCardProps {
  accountId: string;
}
type HealthData = NonNullable<ReturnType<typeof useAccountHealth>['data']>;

function HealthFactors({ factors }: { factors: HealthData['health']['factors'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Recency</span>
        <span className="ml-auto font-medium">{factors.recency}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Engagement</span>
        <span className="ml-auto font-medium">{factors.engagement}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Revenue</span>
        <span className="ml-auto font-medium">{factors.revenue}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Win Rate</span>
        <span className="ml-auto font-medium">{factors.winRate}</span>
      </div>
    </div>
  );
}

function QuickStats({ stats }: { stats: HealthData['stats'] }) {
  return (
    <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-lg font-bold">{stats.total_opportunities}</p>
        <p className="text-xs text-muted-foreground">Opportunities</p>
      </div>
      <div>
        <p className="text-lg font-bold">{stats.won_opportunities}</p>
        <p className="text-xs text-muted-foreground">Won</p>
      </div>
      <div>
        <p className="text-lg font-bold">{formatCurrency(stats.total_revenue)}</p>
        <p className="text-xs text-muted-foreground">Revenue</p>
      </div>
    </div>
  );
}

export function AccountHealthCard({ accountId }: AccountHealthCardProps) {
  const { data, isLoading } = useAccountHealth(accountId);
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;
  const { health, lifecycle_stage, stats } = data;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Account Health
          </CardTitle>
          <Badge className={cn('text-xs', lifecycleColors[lifecycle_stage])}>
            {lifecycleLabels[lifecycle_stage] ?? lifecycle_stage}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Health Score</span>
            <Badge variant="outline" className={cn('text-xs', gradeColors[health.grade])}>
              {health.score}/100 — {health.grade}
            </Badge>
          </div>
          <Progress value={health.score} className="h-2" />
        </div>
        <HealthFactors factors={health.factors} />
        <QuickStats stats={stats} />
      </CardContent>
    </Card>
  );
}

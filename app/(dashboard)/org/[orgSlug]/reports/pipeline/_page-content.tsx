'use client';

import { BarChart3, DollarSign, TrendingUp, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads, useOpportunities } from '@/hooks/useCRM';

const OPPORTUNITY_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const;
const STAGE_COLORS: Record<string, string> = {
  prospecting: 'bg-gray-400',
  qualification: 'bg-blue-400',
  proposal: 'bg-yellow-400',
  negotiation: 'bg-purple-400',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-400',
};

function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

type StageItem = { stage: string; count: number; value: number };

function StageBar({ item, maxCount }: { item: StageItem; maxCount: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatStage(item.stage)}</span>
          <Badge variant="secondary" className="text-xs">
            {item.count}
          </Badge>
        </div>
        <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all ${STAGE_COLORS[item.stage] || 'bg-primary'}`}
          style={{ width: `${(item.count / maxCount) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function PipelineReportPage() {
  const { data: leadsResponse, isLoading: leadsLoading } = useLeads({ limit: 100 });
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities();
  const isLoading = leadsLoading || oppsLoading;

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );

  const allLeads = leadsResponse ? leadsResponse.data || [] : [];
  const allOpps = opportunities ? opportunities.data || [] : [];
  const totalPipelineValue = allOpps.reduce((sum, opp) => sum + (opp.estimated_revenue || 0), 0);
  const wonOpps = allOpps.filter((o) => o.stage === 'closed_won');
  const conversionRate = allOpps.length > 0 ? (wonOpps.length / allOpps.length) * 100 : 0;
  const avgDealSize = allOpps.length > 0 ? totalPipelineValue / allOpps.length : 0;
  const stageData = OPPORTUNITY_STAGES.map((stage) => {
    const inStage = allOpps.filter((o) => o.stage === stage);
    return {
      stage,
      count: inStage.length,
      value: inStage.reduce((sum, o) => sum + (o.estimated_revenue || 0), 0),
    };
  });
  const maxCount = Math.max(...stageData.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline Report</h1>
          <p className="text-muted-foreground">Opportunity funnel and value analysis</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Total Leads"
          value={String(allLeads.length)}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Pipeline Value"
          value={formatCurrency(totalPipelineValue)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Avg Deal Size"
          value={formatCurrency(avgDealSize)}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel by Stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageData.map((item) => (
            <StageBar key={item.stage} item={item} maxCount={maxCount} />
          ))}
          {allOpps.length === 0 && (
            <p className="text-center text-muted-foreground py-6">No opportunities to display</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Stage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Stage</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Count</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">
                    Total Value
                  </th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Avg Value</th>
                </tr>
              </thead>
              <tbody>
                {stageData.map(({ stage, count, value }) => (
                  <tr key={stage} className="border-b last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{formatStage(stage)}</td>
                    <td className="text-right py-2.5 pr-4 tabular-nums">{count}</td>
                    <td className="text-right py-2.5 pr-4 tabular-nums">{formatCurrency(value)}</td>
                    <td className="text-right py-2.5 tabular-nums text-muted-foreground">
                      {count > 0 ? formatCurrency(value / count) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

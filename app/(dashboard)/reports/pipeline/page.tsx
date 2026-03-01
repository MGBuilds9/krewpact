'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react';
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
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(value);
}

export default function PipelineReportPage() {
  const { data: leadsResponse, isLoading: leadsLoading } = useLeads({ limit: 100 });
  const { data: opportunities, isLoading: oppsLoading } = useOpportunities();

  const isLoading = leadsLoading || oppsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const allLeads = leadsResponse?.data ?? [];
  const allOpps = opportunities ?? [];

  const totalPipelineValue = allOpps.reduce((sum, opp) => sum + (opp.estimated_revenue ?? 0), 0);
  const wonOpps = allOpps.filter((o) => o.stage === 'closed_won');
  const conversionRate = allOpps.length > 0 ? (wonOpps.length / allOpps.length) * 100 : 0;
  const avgDealSize = allOpps.length > 0 ? totalPipelineValue / allOpps.length : 0;

  const stageData = OPPORTUNITY_STAGES.map((stage) => {
    const inStage = allOpps.filter((o) => o.stage === stage);
    const stageValue = inStage.reduce((sum, o) => sum + (o.estimated_revenue ?? 0), 0);
    return { stage, count: inStage.length, value: stageValue };
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" /> Total Leads
            </div>
            <div className="text-2xl font-bold">{allLeads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Pipeline Value
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" /> Conversion Rate
            </div>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Avg Deal Size
            </div>
            <div className="text-2xl font-bold">{formatCurrency(avgDealSize)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel by Stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageData.map(({ stage, count, value }) => (
            <div key={stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatStage(stage)}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
                <span className="text-muted-foreground">{formatCurrency(value)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all ${STAGE_COLORS[stage] ?? 'bg-primary'}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {allOpps.length === 0 && (
            <p className="text-center text-muted-foreground py-6">No opportunities to display</p>
          )}
        </CardContent>
      </Card>

      {/* Stage Summary Table */}
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
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Total Value</th>
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

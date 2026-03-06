'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  Target,
  DollarSign,
  Activity,
  TrendingUp,
  Gavel,
  BarChart3,
} from 'lucide-react';

interface OverviewData {
  summary: {
    totalLeads: number;
    totalContacts: number;
    totalAccounts: number;
    totalOpportunities: number;
    totalPipelineRevenue: number;
    conversionRate: number;
    activitiesLast30Days: number;
    totalBids: number;
    totalBidValue: number;
  };
  leadFunnel: Record<string, number>;
  leadsBySource: Record<string, number>;
  leadsByDivision: Record<string, number>;
  pipeline: Record<string, { count: number; revenue: number }>;
  activityVolume: Record<string, number>;
  bidding: Record<string, number>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CRMOverviewReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['crm-overview-report'],
    queryFn: () => apiFetch<OverviewData>('/api/crm/reports/overview'),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { summary, leadFunnel, leadsBySource, pipeline, activityVolume, bidding } = data;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-2xl font-bold">{summary.totalLeads}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Contacts</p>
              <p className="text-2xl font-bold">{summary.totalContacts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Accounts</p>
              <p className="text-2xl font-bold">{summary.totalAccounts}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalPipelineRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-2xl font-bold">{summary.conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Activities (30d)</p>
              <p className="text-2xl font-bold">{summary.activitiesLast30Days}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Gavel className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Bids</p>
              <p className="text-2xl font-bold">{summary.totalBids}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-cyan-500" />
            <div>
              <p className="text-sm text-muted-foreground">Bid Value</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalBidValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(leadFunnel).map(([stage, count]) => (
              <div key={stage} className="text-center">
                <p className="text-2xl font-bold">{count}</p>
                <Badge variant="outline" className="mt-1">
                  {stage.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(leadsBySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{source.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {Object.keys(leadsBySource).length === 0 && (
                <p className="text-sm text-muted-foreground">No lead source data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(pipeline).map(([stage, data]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{stage.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{data.count}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(data.revenue)}
                    </span>
                  </div>
                </div>
              ))}
              {Object.keys(pipeline).length === 0 && (
                <p className="text-sm text-muted-foreground">No pipeline data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Volume (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(activityVolume).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{type}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {Object.keys(activityVolume).length === 0 && (
                <p className="text-sm text-muted-foreground">No activity data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bidding Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Bidding Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(bidding).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {Object.keys(bidding).length === 0 && (
                <p className="text-sm text-muted-foreground">No bidding data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

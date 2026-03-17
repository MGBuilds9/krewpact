'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Building2,
  DollarSign,
  Gavel,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { ElementType } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api-client';

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

function StatCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: ElementType;
  color: string;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function KVSection({
  title,
  entries,
  emptyMsg,
  renderValue,
}: {
  title: string;
  entries: [string, unknown][];
  emptyMsg: string;
  renderValue: (key: string, val: unknown) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMsg}</p>
          ) : (
            entries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm capitalize">{k.replace(/_/g, ' ')}</span>
                {renderValue(k, v)}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
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
        {Array.from({ length: 8 }, (_, n) => n).map((n) => (
          <div key={n} className="h-28 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { summary, leadFunnel, leadsBySource, pipeline, activityVolume, bidding } = data;
  const STATS = [
    { icon: Target, color: 'text-blue-500', label: 'Total Leads', value: summary.totalLeads },
    { icon: Users, color: 'text-green-500', label: 'Contacts', value: summary.totalContacts },
    { icon: Building2, color: 'text-purple-500', label: 'Accounts', value: summary.totalAccounts },
    {
      icon: DollarSign,
      color: 'text-emerald-500',
      label: 'Pipeline Revenue',
      value: formatCurrency(summary.totalPipelineRevenue),
    },
    {
      icon: TrendingUp,
      color: 'text-orange-500',
      label: 'Conversion Rate',
      value: `${summary.conversionRate}%`,
    },
    {
      icon: Activity,
      color: 'text-red-500',
      label: 'Activities (30d)',
      value: summary.activitiesLast30Days,
    },
    { icon: Gavel, color: 'text-indigo-500', label: 'Active Bids', value: summary.totalBids },
    {
      icon: BarChart3,
      color: 'text-cyan-500',
      label: 'Bid Value',
      value: formatCurrency(summary.totalBidValue),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <StatCard key={s.label} icon={s.icon} color={s.color} label={s.label} value={s.value} />
        ))}
      </div>
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
        <KVSection
          title="Lead Sources"
          entries={Object.entries(leadsBySource)}
          emptyMsg="No lead source data"
          renderValue={(_, v) => <Badge variant="secondary">{v as number}</Badge>}
        />
        <KVSection
          title="Pipeline by Stage"
          entries={Object.entries(pipeline)}
          emptyMsg="No pipeline data"
          renderValue={(_, v) => {
            const d = v as { count: number; revenue: number };
            return (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{d.count}</Badge>
                <span className="text-sm text-muted-foreground">{formatCurrency(d.revenue)}</span>
              </div>
            );
          }}
        />
        <KVSection
          title="Activity Volume (30 days)"
          entries={Object.entries(activityVolume)}
          emptyMsg="No activity data"
          renderValue={(_, v) => <Badge variant="secondary">{v as number}</Badge>}
        />
        <KVSection
          title="Bidding Summary"
          entries={Object.entries(bidding)}
          emptyMsg="No bidding data"
          renderValue={(_, v) => <Badge variant="secondary">{v as number}</Badge>}
        />
      </div>
    </div>
  );
}

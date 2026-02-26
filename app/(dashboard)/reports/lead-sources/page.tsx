'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Funnel } from 'lucide-react';
import { useLeads } from '@/hooks/useCRM';
import type { Lead } from '@/hooks/useCRM';

const SOURCE_LABELS: Record<string, string> = {
  apollo: 'Apollo',
  website_form: 'Website Form',
  referral: 'Referral',
  linkedin: 'LinkedIn',
  maps: 'Google Maps',
  cold_outreach: 'Cold Outreach',
  trade_show: 'Trade Show',
  unknown: 'Unknown',
};

const SOURCE_COLORS: Record<string, string> = {
  apollo: 'bg-blue-500',
  website_form: 'bg-green-500',
  referral: 'bg-purple-500',
  linkedin: 'bg-blue-700',
  maps: 'bg-yellow-500',
  cold_outreach: 'bg-orange-500',
  trade_show: 'bg-pink-500',
  unknown: 'bg-gray-400',
};

interface SourceStats {
  source: string;
  count: number;
  qualifiedCount: number;
  wonCount: number;
  avgScore: number;
}

function groupLeadsBySource(leads: Lead[]): SourceStats[] {
  const groups: Record<string, Lead[]> = {};

  for (const lead of leads) {
    const source = lead.source_channel ?? 'unknown';
    if (!groups[source]) {
      groups[source] = [];
    }
    groups[source].push(lead);
  }

  return Object.entries(groups)
    .map(([source, group]) => {
      const qualifiedCount = group.filter((l) =>
        ['qualified', 'estimating', 'proposal_sent', 'won'].includes(l.status)
      ).length;
      const wonCount = group.filter((l) => l.status === 'won').length;
      const totalScore = group.reduce((sum, l) => sum + (l.lead_score ?? 0), 0);

      return {
        source,
        count: group.length,
        qualifiedCount,
        wonCount,
        avgScore: group.length > 0 ? totalScore / group.length : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return '0%';
  return `${((numerator / denominator) * 100).toFixed(0)}%`;
}

export default function LeadSourcesPage() {
  const { data: leadsResponse, isLoading } = useLeads({ limit: 100 });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const allLeads = leadsResponse?.data ?? [];
  const sourceStats = groupLeadsBySource(allLeads);
  const maxCount = Math.max(...sourceStats.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Funnel className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Sources</h1>
          <p className="text-muted-foreground">Channel breakdown and conversion performance</p>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leads by Source Channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourceStats.length === 0 && (
            <p className="text-center text-muted-foreground py-6">No lead data available</p>
          )}
          {sourceStats.map(({ source, count }) => (
            <div key={source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{SOURCE_LABELS[source] ?? source}</span>
                <Badge variant="secondary" className="tabular-nums">{count}</Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${SOURCE_COLORS[source] ?? 'bg-primary'}`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Source Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Source Performance Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Source Channel</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Leads</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Avg Score</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Qualified %</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Won %</th>
                </tr>
              </thead>
              <tbody>
                {sourceStats.map(({ source, count, qualifiedCount, wonCount, avgScore }) => (
                  <tr key={source} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${SOURCE_COLORS[source] ?? 'bg-gray-400'}`} />
                        <span className="font-medium">{SOURCE_LABELS[source] ?? source}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 pr-4 tabular-nums">{count}</td>
                    <td className="text-right py-2.5 pr-4 tabular-nums">{avgScore.toFixed(0)}</td>
                    <td className="text-right py-2.5 pr-4 tabular-nums">{pct(qualifiedCount, count)}</td>
                    <td className="text-right py-2.5 tabular-nums">{pct(wonCount, count)}</td>
                  </tr>
                ))}
                {sourceStats.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-6">
                      No data to display
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

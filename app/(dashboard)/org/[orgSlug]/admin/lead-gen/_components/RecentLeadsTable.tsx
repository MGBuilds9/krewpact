'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { useLeads } from '@/hooks/useCRM';

const STAGE_BADGE_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  qualified: 'bg-blue-100 text-blue-700 border-blue-200',
  estimating: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  proposal_sent: 'bg-purple-100 text-purple-700 border-purple-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-red-100 text-red-700 border-red-200',
};

function formatStage(s: string) {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

type LeadItem = NonNullable<ReturnType<typeof useLeads>['data']>['data'][number];

interface RecentLeadsTableProps {
  leads: LeadItem[];
}

export function RecentLeadsTable({ leads }: RecentLeadsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Leads</span>
          <Badge variant="secondary">{leads.length} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No leads found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Lead</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Source</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Score</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Stage</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 10).map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium truncate max-w-[160px]">{lead.company_name}</div>
                      {lead.industry && (
                        <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                          {lead.industry}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {lead.source_channel ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {lead.lead_score != null ? lead.lead_score : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${STAGE_BADGE_COLORS[lead.status] ?? ''}`}
                      >
                        {formatStage(lead.status)}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                      {formatRelativeTime(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

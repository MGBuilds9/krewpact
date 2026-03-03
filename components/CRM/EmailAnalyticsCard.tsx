'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Eye, MousePointerClick, Reply } from 'lucide-react';

interface EmailAnalyticsCardProps {
  templateId?: string;
  sequenceId?: string;
}

interface AnalyticsData {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
}

function rateColor(rate: number, thresholds: { green: number; yellow: number }): string {
  if (rate >= thresholds.green) return 'text-green-600';
  if (rate >= thresholds.yellow) return 'text-amber-600';
  return 'text-red-500';
}

export function EmailAnalyticsCard({ templateId, sequenceId }: EmailAnalyticsCardProps) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['outreach-analytics', templateId, sequenceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (templateId) params.set('template_id', templateId);
      if (sequenceId) params.set('sequence_id', sequenceId);
      const res = await fetch(`/api/crm/outreach/analytics?${params}`);
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 w-12 rounded bg-muted mb-2" />
              <div className="h-6 w-8 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Sent',
      value: data.total_sent,
      rate: null as number | null,
      icon: Mail,
      colorClass: 'text-foreground',
    },
    {
      label: 'Opened',
      value: data.total_opened,
      rate: data.open_rate,
      icon: Eye,
      colorClass: rateColor(data.open_rate, { green: 20, yellow: 10 }),
    },
    {
      label: 'Clicked',
      value: data.total_clicked,
      rate: data.click_rate,
      icon: MousePointerClick,
      colorClass: rateColor(data.click_rate, { green: 5, yellow: 2 }),
    },
    {
      label: 'Replied',
      value: data.total_replied,
      rate: data.reply_rate,
      icon: Reply,
      colorClass: rateColor(data.reply_rate, { green: 2, yellow: 1 }),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{m.value}</span>
              {m.rate !== null && (
                <span className={`text-sm font-medium ${m.colorClass}`}>{m.rate}%</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

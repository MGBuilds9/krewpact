'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useEnrichmentStats } from '@/hooks/useCRM';
import { Activity, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STAT_CARDS = [
  { key: 'total' as const, label: 'Total Processed', icon: Activity, color: 'text-blue-600' },
  { key: 'pending' as const, label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { key: 'completed' as const, label: 'Completed', icon: CheckCircle2, color: 'text-green-600' },
  { key: 'failed' as const, label: 'Failed', icon: AlertTriangle, color: 'text-red-600' },
] as const;

export function EnrichmentStatsCards() {
  const { data, isLoading } = useEnrichmentStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-muted/50 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{data?.[key] ?? 0}</p>
              </div>
              <Icon className={`h-8 w-8 ${color} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Run</p>
              <p className="text-2xl font-bold">{formatRelativeTime(data?.lastRunAt ?? null)}</p>
            </div>
            <Loader2 className="h-8 w-8 text-purple-600 opacity-80" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

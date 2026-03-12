'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Building2, Target, BarChart3, Loader2 } from 'lucide-react';

interface ClosedLoopData {
  won_deals_this_month: number;
  accounts_from_wins: number;
  active_icps: number;
  icp_accuracy_pct: number;
}

const STAT_CARDS = [
  {
    key: 'won_deals_this_month' as const,
    label: 'Won Deals This Month',
    icon: Trophy,
    color: 'text-green-600',
    format: (v: number) => v.toString(),
  },
  {
    key: 'accounts_from_wins' as const,
    label: 'Accounts from Wins',
    icon: Building2,
    color: 'text-blue-600',
    format: (v: number) => v.toString(),
  },
  {
    key: 'active_icps' as const,
    label: 'ICP Profiles Active',
    icon: Target,
    color: 'text-purple-600',
    format: (v: number) => v.toString(),
  },
  {
    key: 'icp_accuracy_pct' as const,
    label: 'ICP Accuracy',
    icon: BarChart3,
    color: 'text-amber-600',
    format: (v: number) => `${v}%`,
  },
] as const;

export function ClosedLoopStats() {
  const [data, setData] = useState<ClosedLoopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const res = await fetch('/api/crm/stats/closed-loop');
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          throw new Error((body.error as string | undefined) ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as ClosedLoopData;
        if (!cancelled) setData(json);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stats');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-muted/50 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Failed to load closed-loop stats: {error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, format }) => {
        const value = data?.[key] ?? 0;
        return (
          <Card key={key}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{format(value)}</p>
                </div>
                <Icon className={`h-8 w-8 ${color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

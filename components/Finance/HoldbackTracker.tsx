'use client';

import { AlertCircle, Calendar, CheckCircle2, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useHoldbackSchedule } from '@/hooks/useFinancialOps';
import type { HoldbackItem } from '@/lib/services/financial-ops';
import { cn } from '@/lib/utils';

const CAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

const STATUS_CONFIG: Record<
  HoldbackItem['status'],
  { label: string; color: string; icon: typeof Clock }
> = {
  held: { label: 'Held', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock },
  released: {
    label: 'Released',
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle2,
  },
  pending_performance: {
    label: 'Awaiting Performance',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-300',
    icon: AlertCircle,
  },
};

interface HoldbackTrackerProps {
  projectId: string;
}

function HoldbackRow({ item }: { item: HoldbackItem }) {
  const config = STATUS_CONFIG[item.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">
            Issued {new Date(item.invoiceDate).toLocaleDateString('en-CA')}
          </p>
          {item.releaseDate && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="h-3 w-3" />
              Release: {new Date(item.releaseDate).toLocaleDateString('en-CA')}
              {item.daysUntilRelease !== null && item.daysUntilRelease > 0 && (
                <span className="ml-1">({item.daysUntilRelease}d)</span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="text-sm font-semibold tabular-nums">
          {CAD.format(item.holdbackAmount)}
        </span>
        <Badge variant="outline" className={cn('border text-xs', config.color)}>
          {config.label}
        </Badge>
      </div>
    </div>
  );
}

export function HoldbackTracker({ projectId }: HoldbackTrackerProps) {
  const { data, isLoading } = useHoldbackSchedule(projectId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Holdback Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Holdback Schedule (10% — Ontario Construction Act)
          </CardTitle>
          {data && (
            <div className="flex gap-4 text-sm">
              <span className="text-amber-600 font-medium">Held: {CAD.format(data.totalHeld)}</span>
              <span className="text-green-600 font-medium">
                Released: {CAD.format(data.totalReleased)}
              </span>
            </div>
          )}
        </div>
        {data?.nextRelease && (
          <p className="text-xs text-muted-foreground mt-1">
            Next release: {new Date(data.nextRelease).toLocaleDateString('en-CA')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!data?.items.length ? (
          <EmptyState
            icon={Calendar}
            title="No holdbacks yet"
            description="Holdbacks appear once progress payment invoices are submitted."
          />
        ) : (
          data.items.map((item) => <HoldbackRow key={item.invoiceId} item={item} />)
        )}
      </CardContent>
    </Card>
  );
}

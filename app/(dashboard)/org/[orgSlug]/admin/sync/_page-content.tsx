'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { type EntityStat, type SyncError, useSyncStatus } from '@/hooks/useSystem';

function formatEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString('en-CA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

interface SummaryCardsProps {
  loading: boolean;
  totalJobs: number;
  totalSucceeded: number;
  totalFailed: number;
  totalQueued: number;
}

function SummaryCards({
  loading,
  totalJobs,
  totalSucceeded,
  totalFailed,
  totalQueued,
}: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">
            Total Jobs
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums">{totalJobs}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">
            Succeeded
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums text-green-600">{totalSucceeded}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">
            Failed
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums text-red-600">{totalFailed}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="text-xs font-medium uppercase tracking-wider">
            Queued
          </CardDescription>
          <CardTitle className="text-2xl tabular-nums text-yellow-600">{totalQueued}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

const TRIGGERABLE_ENTITIES = [
  'account',
  'contact',
  'estimate',
  'opportunity',
  'sales_order',
  'project',
  'task',
  'supplier',
  'expense_claim',
  'timesheet',
] as const;

type TriggerableEntity = (typeof TRIGGERABLE_ENTITIES)[number];

function TriggerButton({ entityType }: { entityType: TriggerableEntity }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleTrigger() {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: entityType }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={status === 'loading'}
      onClick={() => void handleTrigger()}
      className="gap-1"
    >
      <RefreshCw className={`h-3 w-3 ${status === 'loading' ? 'animate-spin' : ''}`} />
      {status === 'success' ? 'Queued' : status === 'error' ? 'Failed' : 'Trigger'}
    </Button>
  );
}

interface EntityTableProps {
  loading: boolean;
  stats: EntityStat[];
}
function EntityTable({ loading, stats }: EntityTableProps) {
  const visibleStats = stats.filter((s) => s.total > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity Sync Status</CardTitle>
        <CardDescription>Breakdown by ERPNext document type</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Entity Type</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                  <th className="pb-2 font-medium text-right">OK</th>
                  <th className="pb-2 font-medium text-right">Failed</th>
                  <th className="pb-2 font-medium text-right">Queued</th>
                  <th className="pb-2 font-medium text-right">Last Sync</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleStats.map((s) => (
                  <tr key={s.entity_type} className="border-b last:border-0">
                    <td className="py-2">{formatEntityType(s.entity_type)}</td>
                    <td className="py-2 text-right tabular-nums">{s.total}</td>
                    <td className="py-2 text-right tabular-nums text-green-600">{s.succeeded}</td>
                    <td className="py-2 text-right tabular-nums text-red-600">
                      {s.failed > 0 ? s.failed : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums text-yellow-600">
                      {s.queued > 0 ? s.queued : '—'}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {formatDate(s.last_sync_at)}
                    </td>
                    <td className="py-2 text-right">
                      {(TRIGGERABLE_ENTITIES as readonly string[]).includes(s.entity_type) && (
                        <TriggerButton entityType={s.entity_type as TriggerableEntity} />
                      )}
                    </td>
                  </tr>
                ))}
                {visibleStats.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-muted-foreground">
                      No sync jobs recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentErrors({ errors }: { errors: SyncError[] }) {
  if (errors.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Errors</CardTitle>
        <CardDescription>Last 20 sync failures</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {errors.map((err) => (
            <div key={err.id} className="border rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{err.error_code}</span>
                <span className="text-xs text-muted-foreground">{formatDate(err.created_at)}</span>
              </div>
              <p className="mt-1 text-destructive">{err.error_message}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SyncDashboardPage() {
  const { data: status, isLoading, isError, error } = useSyncStatus();

  const stats = status?.stats ?? [];
  const totalSucceeded = stats.reduce((s, e) => s + e.succeeded, 0);
  const totalFailed = stats.reduce((s, e) => s + e.failed, 0);
  const totalQueued = stats.reduce((s, e) => s + e.queued, 0);
  const recentErrors = status?.recent_errors ?? [];

  return (
    <>
      <title>ERPNext Sync — KrewPact</title>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">ERPNext Sync Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor sync status between KrewPact and ERPNext. All syncs use eventual consistency
            with retry and dead-letter.
          </p>
        </div>
        {isError && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">
                {error instanceof Error ? error.message : 'Failed to load sync status.'}
              </p>
            </CardContent>
          </Card>
        )}
        <SummaryCards
          loading={isLoading}
          totalJobs={status?.total_jobs ?? 0}
          totalSucceeded={totalSucceeded}
          totalFailed={totalFailed}
          totalQueued={totalQueued}
        />
        <EntityTable loading={isLoading} stats={stats} />
        <RecentErrors errors={recentErrors} />
      </div>
    </>
  );
}

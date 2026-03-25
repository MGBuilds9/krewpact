'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unknown';

interface ServiceRow {
  key: string;
  label: string;
  status: ServiceStatus;
}

interface HealthResponse {
  status: string;
  checks: Record<string, string>;
  timestamp: string;
}

const SERVICE_LABELS: Record<string, string> = {
  supabase: 'Supabase',
  supabase_data: 'Supabase Data',
  clerk: 'Clerk Auth',
  auth_bridge: 'Auth Bridge',
  erpnext: 'ERPNext',
  redis: 'Redis',
  qstash: 'QStash',
  qstash_signing_keys: 'QStash Keys',
  sentry: 'Sentry',
  crons: 'Cron Jobs',
};

function StatusDot({ status }: { status: ServiceStatus }) {
  const colorMap: Record<ServiceStatus, string> = {
    ok: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    unknown: 'bg-gray-400',
  };
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[status]}`}
      aria-label={status}
    />
  );
}

function ServiceStatusRow({ row }: { row: ServiceRow }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{row.label}</span>
      <div className="flex items-center gap-2">
        <StatusDot status={row.status} />
        <span className="capitalize w-16 text-right font-mono text-xs">{row.status}</span>
      </div>
    </div>
  );
}

function parseServices(checks: Record<string, string>): ServiceRow[] {
  return Object.entries(checks).map(([key, val]) => ({
    key,
    label: SERVICE_LABELS[key] ?? key,
    status: (val as ServiceStatus) ?? 'unknown',
  }));
}

export function SystemHealthCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health?deep=true');
      const data = (await res.json()) as HealthResponse;
      setHealth(data);
      setLastUpdated(new Date());
    } catch {
      // keep stale data on failure
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => void fetchHealth(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const overallStatus = health?.status ?? 'unknown';
  const services = health ? parseServices(health.checks) : [];

  const headerColor =
    overallStatus === 'ok'
      ? 'text-green-600'
      : overallStatus === 'degraded'
        ? 'text-yellow-600'
        : 'text-gray-500';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          System Health
          {!loading && (
            <span className={`text-sm font-normal capitalize ${headerColor}`}>
              {overallStatus}
            </span>
          )}
        </CardTitle>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Updated {lastUpdated.toLocaleTimeString('en-CA')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No health data available.</p>
        ) : (
          <div className="divide-y">
            {services.map((row) => (
              <ServiceStatusRow key={row.key} row={row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

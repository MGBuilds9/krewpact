import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ServiceClient = ReturnType<typeof createServiceClient>;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}

async function checkTableCounts(
  supabase: ServiceClient,
  checks: Record<string, string>,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const [leadsRes, projectsRes, divisionsRes] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('divisions').select('id', { count: 'exact', head: true }),
    ]);
    const tableCounts = {
      leads: leadsRes.count ?? 0,
      projects: projectsRes.count ?? 0,
      divisions: divisionsRes.count ?? 0,
    };
    details.table_counts = tableCounts;
    checks.supabase_data = tableCounts.divisions > 0 ? 'ok' : 'degraded';
  } catch {
    checks.supabase_data = 'down';
  }
}

async function checkRedisHealth(checks: Record<string, string>): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return;
  try {
    const testKey = `krewpact:health:${Date.now()}`;
    const headers = { Authorization: `Bearer ${redisToken}` };
    await fetch(`${redisUrl}/set/${testKey}/ok?EX=10`, { headers });
    const getRes = await fetch(`${redisUrl}/get/${testKey}`, { headers });
    const getData = (await getRes.json()) as { result: string | null };
    await fetch(`${redisUrl}/del/${testKey}`, { headers });
    checks.redis = getData.result === 'ok' ? 'ok' : 'degraded';
  } catch {
    checks.redis = 'down';
  }
}

async function checkClerkHealth(checks: Record<string, string>): Promise<void> {
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) return;
  try {
    const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
      headers: { Authorization: `Bearer ${clerkKey}` },
    });
    checks.clerk = res.ok ? 'ok' : 'degraded';
  } catch {
    checks.clerk = 'down';
  }

  checks.auth_bridge =
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
      ? 'ok'
      : 'degraded';
}

async function checkErpNextHealth(checks: Record<string, string>): Promise<void> {
  const erpUrl = process.env.ERPNEXT_BASE_URL;
  const erpKey = process.env.ERPNEXT_API_KEY?.trim();
  const erpSecret = process.env.ERPNEXT_API_SECRET?.trim();
  if (!erpUrl || !erpKey || !erpSecret) return;
  try {
    const res = await withTimeout(
      fetch(`${erpUrl}/api/method/frappe.auth.get_logged_user`, {
        headers: { Authorization: `token ${erpKey}:${erpSecret}` },
      }),
      12000,
    );
    checks.erpnext = res.ok ? 'ok' : 'degraded';
  } catch {
    checks.erpnext = 'down';
  }
}

async function checkQStashHealth(checks: Record<string, string>): Promise<void> {
  const token = process.env.QSTASH_TOKEN;
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!token) return;

  try {
    const baseUrl = process.env.QSTASH_URL || 'https://qstash.upstash.io';
    const res = await withTimeout(
      fetch(`${baseUrl}/v2/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      12_000,
    );

    checks.qstash = res.ok ? 'ok' : 'degraded';
    checks.qstash_signing_keys = currentSigningKey && nextSigningKey ? 'ok' : 'degraded';
  } catch {
    checks.qstash = 'down';
    checks.qstash_signing_keys = currentSigningKey && nextSigningKey ? 'ok' : 'down';
  }
}

async function runCronCheck(
  supabase: ServiceClient,
  checks: Record<string, string>,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: lastRuns } = await supabase
      .from('cron_runs')
      .select('cron_name, status, started_at')
      .order('started_at', { ascending: false })
      .limit(50);
    if (lastRuns && lastRuns.length > 0) {
      const latest = new Map<string, { status: string; started_at: string }>();
      lastRuns.forEach((run) => {
        if (!latest.has(run.cron_name))
          latest.set(run.cron_name, { status: run.status, started_at: run.started_at });
      });
      details.cron_last_runs = Object.fromEntries(latest);
      checks.crons = [...latest.values()].some((r) => r.status === 'failure') ? 'degraded' : 'ok';
    } else {
      checks.crons = 'ok';
    }
  } catch (err) {
    logger.error('Health check: cron watchdog query failed', {
      error: err instanceof Error ? err : undefined,
    });
    checks.crons = 'degraded';
  }
}

function checkSentryConfig(checks: Record<string, string>): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    checks.sentry = 'degraded';
    return;
  }
  try {
    const url = new URL(dsn);
    // Sentry DSN format: https://<key>@<host>/project-id
    const validScheme = url.protocol === 'https:' || url.protocol === 'http:';
    const hasHost = url.hostname.length > 0;
    const hasProject = url.pathname.length > 1; // at minimum "/<id>"
    checks.sentry = validScheme && hasHost && hasProject ? 'ok' : 'degraded';
  } catch {
    checks.sentry = 'degraded';
  }
}

async function runDeepChecks(
  supabase: ServiceClient,
  checks: Record<string, string>,
  details: Record<string, unknown>,
): Promise<void> {
  await checkTableCounts(supabase, checks, details);
  checkSentryConfig(checks);
  await Promise.all([
    checkRedisHealth(checks),
    checkClerkHealth(checks),
    checkErpNextHealth(checks),
    checkQStashHealth(checks),
  ]);
  await runCronCheck(supabase, checks, details);
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get('deep') === 'true';
  const checks: Record<string, string> = {};
  const details: Record<string, unknown> = {};
  const supabase = createServiceClient();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const { error } = await supabase
      .from('divisions')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);
    clearTimeout(timeout);
    checks.supabase = error ? 'degraded' : 'ok';
  } catch {
    checks.supabase = 'down';
  }

  if (deep) await runDeepChecks(supabase, checks, details);

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      checks,
      ...(deep ? { details } : {}),
    },
    { status: allOk ? 200 : 503 },
  );
}

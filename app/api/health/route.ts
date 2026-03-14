import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const deep = req.nextUrl.searchParams.get('deep') === 'true';
  const checks: Record<string, string> = {};
  const details: Record<string, unknown> = {};

  const supabase = createServiceClient();

  // ── Supabase: basic connectivity ──────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const { error } = await supabase.from('divisions').select('id').limit(1).abortSignal(controller.signal);
    clearTimeout(timeout);
    checks.supabase = error ? 'degraded' : 'ok';
  } catch {
    checks.supabase = 'down';
  }

  if (deep) {
    // ── Supabase: verify key tables have data ─────────────────────────────
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
      checks.supabase_data =
        tableCounts.divisions > 0 ? 'ok' : 'degraded';
    } catch {
      checks.supabase_data = 'down';
    }

    // ── Redis: SET/GET/DEL roundtrip ──────────────────────────────────────
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (redisUrl && redisToken) {
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

    // ── Clerk: verify API reachable ───────────────────────────────────────
    const clerkKey = process.env.CLERK_SECRET_KEY;
    if (clerkKey) {
      try {
        const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
          headers: { Authorization: `Bearer ${clerkKey}` },
        });
        checks.clerk = res.ok ? 'ok' : 'degraded';
      } catch {
        checks.clerk = 'down';
      }
    }

    // ── ERPNext: verify tunnel is up ──────────────────────────────────────
    const erpUrl = process.env.ERPNEXT_BASE_URL;
    const erpKey = process.env.ERPNEXT_API_KEY;
    const erpSecret = process.env.ERPNEXT_API_SECRET;
    if (erpUrl && erpKey && erpSecret) {
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

    // ── Cron watchdog: check last runs ────────────────────────────────────
    try {
      const { data: lastRuns } = await supabase
        .from('cron_runs')
        .select('cron_name, status, started_at')
        .order('started_at', { ascending: false })
        .limit(50);

      if (lastRuns && lastRuns.length > 0) {
        // Group by cron_name, take latest
        const latest = new Map<string, { status: string; started_at: string }>();
        for (const run of lastRuns) {
          if (!latest.has(run.cron_name)) {
            latest.set(run.cron_name, { status: run.status, started_at: run.started_at });
          }
        }
        details.cron_last_runs = Object.fromEntries(latest);
        // Check for any failures in the latest run per cron
        const hasFailure = [...latest.values()].some((r) => r.status === 'failure');
        checks.crons = hasFailure ? 'degraded' : 'ok';
      } else {
        checks.crons = 'ok'; // No data yet is not an error
      }
    } catch (err) {
      logger.error('Health check: cron watchdog query failed', {
        error: err instanceof Error ? err : undefined,
      });
      checks.crons = 'degraded';
    }
  }

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

import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { sendEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Internal smoke test — runs every hour.
 * Hits key internal APIs and data paths, logs results,
 * and alerts on failure via email.
 *
 * Alert cooldown: only sends email on state transition (pass→fail)
 * or at most once per hour to prevent email flooding.
 */

const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

async function shouldSendAlert(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: lastFailedRun } = await supabase
    .from('smoke_test_results')
    .select('created_at, status')
    .neq('status', 'pass')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastFailedRun) return true;

  const msSinceLastFailure = Date.now() - new Date(lastFailedRun.created_at).getTime();
  if (msSinceLastFailure >= ALERT_COOLDOWN_MS) return true;

  const { data: prevRun } = await supabase
    .from('smoke_test_results')
    .select('status')
    .order('created_at', { ascending: false })
    .limit(1)
    .range(1, 1)
    .maybeSingle();

  if (prevRun && prevRun.status !== 'pass') {
    logger.info('Smoke test alert suppressed (cooldown active, previous run also failed)');
    return false;
  }

  return true;
}

interface SmokeCheck {
  name: string;
  status: 'pass' | 'fail';
  detail?: string;
}

async function checkRedis(): Promise<SmokeCheck | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return null;
  try {
    const res = await fetch(`${redisUrl}/ping`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const body = await res.text();
    return {
      name: 'redis_ping',
      status: body.includes('PONG') ? 'pass' : 'fail',
      detail: body.includes('PONG') ? undefined : body.slice(0, 80),
    };
  } catch (err) {
    return { name: 'redis_ping', status: 'fail', detail: String(err) };
  }
}

async function checkClerk(): Promise<SmokeCheck | null> {
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (!clerkKey) return null;
  try {
    const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
      headers: { Authorization: `Bearer ${clerkKey}` },
    });
    return {
      name: 'clerk_api',
      status: res.ok ? 'pass' : 'fail',
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { name: 'clerk_api', status: 'fail', detail: String(err) };
  }
}

async function checkErpNext(): Promise<SmokeCheck | null> {
  const erpUrl = process.env.ERPNEXT_BASE_URL;
  const erpKey = process.env.ERPNEXT_API_KEY?.trim();
  const erpSecret = process.env.ERPNEXT_API_SECRET?.trim();
  if (!erpUrl || !erpKey || !erpSecret) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${erpUrl}/api/method/frappe.auth.get_logged_user`, {
      headers: { Authorization: `token ${erpKey}:${erpSecret}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return {
      name: 'erpnext_auth',
      status: res.ok ? 'pass' : 'fail',
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { name: 'erpnext_auth', status: 'fail', detail: String(err) };
  }
}

async function runChecks(): Promise<SmokeCheck[]> {
  const checks: SmokeCheck[] = [];
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase.from('divisions').select('id').limit(1);
    checks.push({
      name: 'supabase_read',
      status: !error && data && data.length > 0 ? 'pass' : 'fail',
      detail: error?.message,
    });
  } catch (err) {
    checks.push({ name: 'supabase_read', status: 'fail', detail: String(err) });
  }

  const redisCheck = await checkRedis();
  if (redisCheck) checks.push(redisCheck);

  const clerkCheck = await checkClerk();
  if (clerkCheck) checks.push(clerkCheck);

  const erpCheck = await checkErpNext();
  if (erpCheck) checks.push(erpCheck);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com';
  try {
    const res = await fetch(`${appUrl}/api/health`, {
      headers: { 'User-Agent': 'KrewPact-SmokeTest/1.0' },
    });
    checks.push({
      name: 'health_endpoint',
      status: res.ok ? 'pass' : 'fail',
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    });
  } catch (err) {
    checks.push({ name: 'health_endpoint', status: 'fail', detail: String(err) });
  }

  return checks;
}

async function sendAlertEmail(failedChecks: SmokeCheck[]) {
  const alertEmail = process.env.ALERT_EMAIL ?? 'michael.guirguis@mdmgroupinc.ca';
  const failedList = failedChecks
    .map((c) => `- ${c.name}: ${c.detail ?? 'unknown error'}`)
    .join('\n');
  await sendEmail({
    to: alertEmail,
    subject: `[KrewPact] Smoke Test FAILED — ${failedChecks.length} check(s) down`,
    html: `
      <h2>KrewPact Smoke Test Failure</h2>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p><strong>Failed checks:</strong></p>
      <pre>${failedList}</pre>
      <p>Check <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com'}/api/health?deep=true">deep health</a> for details.</p>
    `,
  });
}

async function maybeAlert(failedChecks: SmokeCheck[]): Promise<void> {
  if (failedChecks.length === 0) return;
  logger.warn('Smoke test failures detected', {
    failedCount: failedChecks.length,
    failed: failedChecks.map((c) => c.name),
  });
  let shouldAlert = true;
  try {
    shouldAlert = await shouldSendAlert();
  } catch (err) {
    logger.error('Failed to check alert cooldown', {
      error: err instanceof Error ? err : undefined,
    });
  }
  if (shouldAlert) {
    try {
      await sendAlertEmail(failedChecks);
    } catch (err) {
      logger.error('Failed to send smoke test alert email', {
        error: err instanceof Error ? err : undefined,
      });
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startTime = Date.now();
  const checks = await runChecks();
  const durationMs = Date.now() - startTime;

  const failedChecks = checks.filter((c) => c.status === 'fail');
  const status =
    failedChecks.length === 0 ? 'pass' : failedChecks.length < checks.length ? 'partial' : 'fail';

  try {
    const supabase = createServiceClient();
    await supabase.from('smoke_test_results').insert({
      status,
      checks: Object.fromEntries(
        checks.map((c) => [c.name, { status: c.status, detail: c.detail }]),
      ),
      failed_checks: failedChecks.map((c) => c.name),
      duration_ms: durationMs,
    });
  } catch (err) {
    logger.error('Failed to log smoke test results', {
      error: err instanceof Error ? err : undefined,
    });
  }

  await maybeAlert(failedChecks);

  return NextResponse.json({
    success: true,
    status,
    checks: Object.fromEntries(checks.map((c) => [c.name, c.status])),
    failed: failedChecks.map((c) => c.name),
    duration_ms: durationMs,
    timestamp: new Date().toISOString(),
  });
}

export { POST as GET };

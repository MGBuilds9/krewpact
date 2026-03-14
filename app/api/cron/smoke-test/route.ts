import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';

/**
 * Internal smoke test — runs every 15 minutes.
 * Hits key internal APIs and data paths, logs results,
 * and alerts on failure via email.
 */

interface SmokeCheck {
  name: string;
  status: 'pass' | 'fail';
  detail?: string;
}

async function runChecks(): Promise<SmokeCheck[]> {
  const checks: SmokeCheck[] = [];
  const supabase = createServiceClient();

  // 1. Supabase: query divisions
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

  // 2. Supabase: write test (insert + delete to smoke_test_results is done after all checks)

  // 3. Redis: PING
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      const body = await res.text();
      checks.push({
        name: 'redis_ping',
        status: body.includes('PONG') ? 'pass' : 'fail',
        detail: body.includes('PONG') ? undefined : body.slice(0, 80),
      });
    } catch (err) {
      checks.push({ name: 'redis_ping', status: 'fail', detail: String(err) });
    }
  }

  // 4. Clerk: list 1 user
  const clerkKey = process.env.CLERK_SECRET_KEY;
  if (clerkKey) {
    try {
      const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
        headers: { Authorization: `Bearer ${clerkKey}` },
      });
      checks.push({
        name: 'clerk_api',
        status: res.ok ? 'pass' : 'fail',
        detail: res.ok ? undefined : `HTTP ${res.status}`,
      });
    } catch (err) {
      checks.push({ name: 'clerk_api', status: 'fail', detail: String(err) });
    }
  }

  // 5. ERPNext: get_logged_user
  const erpUrl = process.env.ERPNEXT_BASE_URL;
  const erpKey = process.env.ERPNEXT_API_KEY;
  const erpSecret = process.env.ERPNEXT_API_SECRET;
  if (erpUrl && erpKey && erpSecret) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(
        `${erpUrl}/api/method/frappe.auth.get_logged_user`,
        {
          headers: { Authorization: `token ${erpKey}:${erpSecret}` },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      checks.push({
        name: 'erpnext_auth',
        status: res.ok ? 'pass' : 'fail',
        detail: res.ok ? undefined : `HTTP ${res.status}`,
      });
    } catch (err) {
      checks.push({ name: 'erpnext_auth', status: 'fail', detail: String(err) });
    }
  }

  // 6. Health endpoint itself
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
  const alertEmail = process.env.ALERT_EMAIL ?? 'michael@mdmgroupinc.ca';
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const checks = await runChecks();
  const durationMs = Date.now() - startTime;

  const failedChecks = checks.filter((c) => c.status === 'fail');
  const status = failedChecks.length === 0 ? 'pass' : failedChecks.length < checks.length ? 'partial' : 'fail';

  // Log results to smoke_test_results table
  try {
    const supabase = createServiceClient();
    await supabase.from('smoke_test_results').insert({
      status,
      checks: Object.fromEntries(checks.map((c) => [c.name, { status: c.status, detail: c.detail }])),
      failed_checks: failedChecks.map((c) => c.name),
      duration_ms: durationMs,
    });
  } catch (err) {
    logger.error('Failed to log smoke test results', {
      error: err instanceof Error ? err : undefined,
    });
  }

  // Alert on failures
  if (failedChecks.length > 0) {
    logger.warn('Smoke test failures detected', {
      failedCount: failedChecks.length,
      failed: failedChecks.map((c) => c.name),
    });
    try {
      await sendAlertEmail(failedChecks);
    } catch (err) {
      logger.error('Failed to send smoke test alert email', {
        error: err instanceof Error ? err : undefined,
      });
    }
  }

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

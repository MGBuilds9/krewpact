import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};

  // Supabase connectivity check (3s timeout)
  try {
    const supabase = createServiceClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const { error } = await supabase.from('divisions').select('id').limit(1).abortSignal(controller.signal);
    clearTimeout(timeout);
    checks.supabase = error ? 'degraded' : 'ok';
  } catch {
    checks.supabase = 'down';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}

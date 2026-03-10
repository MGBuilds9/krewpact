import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

export async function GET(_req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r as string))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = await createUserClient();
    const { data: metrics, error } = await supabase
      .from('executive_metrics_cache')
      .select('metric_key, metric_value, computed_at');

    if (error) {
      logger.error('Failed to fetch metrics cache:', { message: error.message });
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // Transform into keyed object
    const result: Record<string, { value: unknown; computed_at: string }> = {};
    for (const m of metrics ?? []) {
      result[m.metric_key] = { value: m.metric_value, computed_at: m.computed_at };
    }

    return NextResponse.json({ metrics: result });
  } catch (err: unknown) {
    logger.error('Overview fetch failed:', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

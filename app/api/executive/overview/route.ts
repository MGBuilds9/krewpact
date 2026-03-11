import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  computePipelineSummaryForDivision,
  computeProjectPortfolioForDivision,
  computeSubscriptionSummaryForDivision,
  computeEstimatingVelocity,
} from '@/lib/executive/metrics';

const EXECUTIVE_ROLES = ['platform_admin', 'executive'];

const VALID_DIVISIONS = new Set([
  'contracting',
  'homes',
  'wood',
  'telecom',
  'group-inc',
  'management',
]);

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  if (!roles.some((r) => EXECUTIVE_ROLES.includes(r as string))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const division = searchParams.get('division');

  try {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Division-filtered path: compute metrics on-the-fly for a specific division
    if (division) {
      if (!VALID_DIVISIONS.has(division)) {
        // Unknown division — return empty metrics gracefully
        return NextResponse.json({ metrics: {} });
      }

      const [pipeline, portfolio, subscriptions, estimating] = await Promise.allSettled([
        computePipelineSummaryForDivision(supabase, division),
        computeProjectPortfolioForDivision(supabase, division),
        computeSubscriptionSummaryForDivision(supabase, division),
        // Estimates table may not have division_id — use org-wide data
        computeEstimatingVelocity(supabase),
      ]);

      const now = new Date().toISOString();
      const result: Record<string, { value: unknown; computed_at: string }> = {};

      if (pipeline.status === 'fulfilled') {
        result['pipeline_summary'] = { value: pipeline.value, computed_at: now };
      }
      if (portfolio.status === 'fulfilled') {
        result['project_portfolio'] = { value: portfolio.value, computed_at: now };
      }
      if (subscriptions.status === 'fulfilled') {
        result['subscription_summary'] = { value: subscriptions.value, computed_at: now };
      }
      if (estimating.status === 'fulfilled') {
        result['estimating_velocity'] = { value: estimating.value, computed_at: now };
      }

      return NextResponse.json({ metrics: result });
    }

    // Default path: return cached org-wide metrics
    const { data: metrics, error } = await supabase
      .from('executive_metrics_cache')
      .select('metric_key, metric_value, computed_at');

    if (error) {
      logger.error('Failed to fetch metrics cache', { message: error.message });
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }

    // Transform into keyed object
    const result: Record<string, { value: unknown; computed_at: string }> = {};
    for (const m of metrics ?? []) {
      result[m.metric_key] = { value: m.metric_value, computed_at: m.computed_at };
    }

    return NextResponse.json({ metrics: result });
  } catch (err: unknown) {
    logger.error('Overview fetch failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 });
  }
}

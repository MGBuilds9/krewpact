import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  computePipelineSummary,
  computeProjectPortfolio,
  computeEstimatingVelocity,
  computeSubscriptionSummary,
} from '@/lib/executive/metrics';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  // Auth: QStash signature, bearer token, or platform_admin
  const authHeader = req.headers.get('authorization');
  const qstashSignature = req.headers.get('upstash-signature');

  if (!qstashSignature && authHeader !== `Bearer ${process.env.QSTASH_TOKEN}`) {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { getKrewpactRoles } = await import('@/lib/api/org');
    const roles = await getKrewpactRoles();
    if (!roles.includes('platform_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const supabase = await createServiceClient();

    const [pipeline, portfolio, estimating, subscriptions] = await Promise.all([
      computePipelineSummary(supabase),
      computeProjectPortfolio(supabase),
      computeEstimatingVelocity(supabase),
      computeSubscriptionSummary(supabase),
    ]);

    // Upsert into executive_metrics_cache
    // Use a fixed org_id placeholder — in production this would iterate orgs
    // For now use the first org or a known org
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1).single();
    const orgId = orgs?.id;

    if (!orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const metrics = [
      {
        org_id: orgId,
        metric_key: 'pipeline_summary',
        metric_value: pipeline,
        computed_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        metric_key: 'project_portfolio',
        metric_value: portfolio,
        computed_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        metric_key: 'estimating_velocity',
        metric_value: estimating,
        computed_at: new Date().toISOString(),
      },
      {
        org_id: orgId,
        metric_key: 'subscription_summary',
        metric_value: subscriptions,
        computed_at: new Date().toISOString(),
      },
    ];

    const { error: upsertError } = await supabase
      .from('executive_metrics_cache')
      .upsert(metrics, { onConflict: 'org_id,metric_key' });

    if (upsertError) {
      logger.error('Failed to upsert metrics cache:', { message: upsertError.message });
      return NextResponse.json({ error: 'Failed to cache metrics' }, { status: 500 });
    }

    return NextResponse.json({ refreshed: metrics.length, computed_at: new Date().toISOString() });
  } catch (err: unknown) {
    logger.error('Metrics refresh failed:', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Metrics refresh failed' }, { status: 500 });
  }
}

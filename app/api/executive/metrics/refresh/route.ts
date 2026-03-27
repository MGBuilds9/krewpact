import { NextResponse } from 'next/server';

import { forbidden, serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import {
  computeEstimatingVelocity,
  computePipelineSummary,
  computeProjectPortfolio,
  computeSubscriptionSummary,
} from '@/lib/executive/metrics';
import { createServiceClient } from '@/lib/supabase/server';

export const POST = withApiRoute({ auth: 'public' }, async ({ req, logger }) => {
  // Auth: QStash signature, bearer token, or platform_admin
  const authHeader = req.headers.get('authorization');
  const qstashSignature = req.headers.get('upstash-signature');

  if (!qstashSignature && authHeader !== `Bearer ${process.env.QSTASH_TOKEN}`) {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) throw forbidden('Unauthorized');
    const { getKrewpactRoles } = await import('@/lib/api/org');
    const roles = await getKrewpactRoles();
    if (!roles.includes('platform_admin')) {
      throw forbidden('Forbidden');
    }
  }

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
    throw serverError('No organization found');
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
    throw serverError('Failed to cache metrics');
  }

  return NextResponse.json({ refreshed: metrics.length, computed_at: new Date().toISOString() });
});

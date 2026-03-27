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

  // Upsert into executive_metrics_cache for all orgs
  const { data: allOrgs, error: orgError } = await supabase.from('organizations').select('id');

  if (orgError || !allOrgs?.length) {
    throw serverError('No organizations found');
  }

  // Process metrics for each org
  const results = await Promise.allSettled(
    allOrgs.map(async (org) => {
      const orgMetrics = [
        {
          org_id: org.id,
          metric_key: 'pipeline_summary',
          metric_value: pipeline,
          computed_at: new Date().toISOString(),
        },
        {
          org_id: org.id,
          metric_key: 'project_portfolio',
          metric_value: portfolio,
          computed_at: new Date().toISOString(),
        },
        {
          org_id: org.id,
          metric_key: 'estimating_velocity',
          metric_value: estimating,
          computed_at: new Date().toISOString(),
        },
        {
          org_id: org.id,
          metric_key: 'subscription_summary',
          metric_value: subscriptions,
          computed_at: new Date().toISOString(),
        },
      ];
      const { error: upsertError } = await supabase
        .from('executive_metrics_cache')
        .upsert(orgMetrics, { onConflict: 'org_id,metric_key' });
      if (upsertError) throw upsertError;
      return org.id;
    }),
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  if (failed > 0) {
    logger.error('Some org metric upserts failed', { succeeded, failed });
  }

  return NextResponse.json({
    refreshed: succeeded * 4,
    orgs_processed: succeeded,
    orgs_failed: failed,
    computed_at: new Date().toISOString(),
  });
});

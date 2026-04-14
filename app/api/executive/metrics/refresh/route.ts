import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { forbidden, serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import {
  computeEstimatingVelocity,
  computePipelineSummary,
  computeProjectPortfolio,
  computeSubscriptionSummary,
} from '@/lib/executive/metrics';
import { verifyQStashSignature } from '@/lib/queue/verify';
import { createServiceClient } from '@/lib/supabase/server';

export const POST = withApiRoute({ auth: 'public' }, async ({ req, logger }) => {
  // Auth: QStash signature, bearer token, or platform_admin
  const authHeader = req.headers.get('authorization');
  const qstashSignature = req.headers.get('upstash-signature');

  if (qstashSignature) {
    const rawBody = await req.clone().text();
    const result = await verifyQStashSignature(qstashSignature, rawBody);
    if (!result.valid) throw forbidden('Invalid QStash signature');
  } else {
    let hasValidToken = false;
    if (authHeader && process.env.QSTASH_TOKEN) {
      const expected = `Bearer ${process.env.QSTASH_TOKEN}`;
      const headerBuf = Buffer.from(authHeader);
      const expectedBuf = Buffer.from(expected);
      if (
        headerBuf.byteLength === expectedBuf.byteLength &&
        timingSafeEqual(headerBuf, expectedBuf)
      ) {
        hasValidToken = true;
      }
    }

    if (!hasValidToken) {
      const { auth } = await import('@clerk/nextjs/server');
      const { userId } = await auth();
      if (!userId) throw forbidden('Unauthorized');
      const { getKrewpactRoles } = await import('@/lib/api/org');
      const roles = await getKrewpactRoles();
      if (!roles.includes('platform_admin')) {
        throw forbidden('Forbidden');
      }
    }
  }

  const supabase = await createServiceClient();

  // Fetch org — guard against accidental multi-org bleed
  const { data: allOrgs, error: orgError } = await supabase.from('organizations').select('id');

  if (orgError || !allOrgs?.length) {
    throw serverError('No organizations found');
  }

  if (allOrgs.length > 1) {
    logger.warn('Multi-org metrics not yet supported — computing for first org only');
  }

  const orgId = allOrgs[0].id;

  const [pipeline, portfolio, estimating, subscriptions] = await Promise.all([
    computePipelineSummary(supabase),
    computeProjectPortfolio(supabase),
    computeEstimatingVelocity(supabase),
    computeSubscriptionSummary(supabase),
  ]);

  const orgMetrics = [
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
    .upsert(orgMetrics, { onConflict: 'org_id,metric_key' });

  if (upsertError) {
    logger.error('Metric upsert failed', { error: upsertError });
    throw serverError('Failed to persist metrics');
  }

  return NextResponse.json({
    refreshed: orgMetrics.length,
    orgs_processed: 1,
    orgs_failed: 0,
    computed_at: new Date().toISOString(),
  });
});

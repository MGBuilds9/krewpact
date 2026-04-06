import { NextResponse } from 'next/server';

import { notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

// Hardcoded seed data — used only when the organizations table doesn't exist yet
const SEED_ORGS: Record<string, object> = {};

export const GET = withApiRoute({}, async ({ params }) => {
  const { slug } = params;

  // Try database first
  try {
    const serviceClient = createServiceClient();

    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, name, slug, status, timezone, locale, metadata')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!orgError && org) {
      const { data: settings } = await serviceClient
        .from('org_settings')
        .select('branding, feature_flags')
        .eq('org_id', org.id)
        .single();

      return NextResponse.json({
        ...org,
        branding: settings?.branding ?? {},
        feature_flags: settings?.feature_flags ?? {},
      });
    } else if (orgError) {
      logger.error('org query error', { slug, code: orgError.code, message: orgError.message });
    }
  } catch (err) {
    logger.error('org lookup failed', { slug, error: err });
  }

  // Fall back to seed data
  const seedOrg = SEED_ORGS[slug];
  if (!seedOrg) throw notFound('Organization');

  return NextResponse.json(seedOrg);
});

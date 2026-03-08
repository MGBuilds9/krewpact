import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { UNAUTHORIZED, errorResponse, notFound } from '@/lib/api/errors';
import { DEMO_MODE } from '@/lib/demo-mode';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

// Hardcoded org data — used when the organizations table doesn't exist yet
const SEED_ORGS: Record<string, object> = {
  'mdm-group': {
    id: 'org_mdm_group',
    name: 'MDM Group Inc.',
    slug: 'mdm-group',
    status: 'active',
    timezone: 'America/Toronto',
    locale: 'en-CA',
    metadata: {},
    branding: {
      company_name: 'MDM Group Inc.',
      primary_color: '#1e3a5f',
    },
    feature_flags: {},
  },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!DEMO_MODE) {
    const { userId } = await auth();
    if (!userId) return errorResponse(UNAUTHORIZED);
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m' });
  if (!rl.success) return rateLimitResponse(rl);

  const { slug } = await params;

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
    }
  } catch {
    // DB table may not exist yet — fall through to seed data
  }

  // Fall back to seed data
  const seedOrg = SEED_ORGS[slug];
  if (!seedOrg) return errorResponse(notFound('Organization'));

  return NextResponse.json(seedOrg);
}

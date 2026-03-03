import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { UNAUTHORIZED, errorResponse, notFound } from '@/lib/api/errors';
import { DEMO_MODE } from '@/lib/demo-mode';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!DEMO_MODE) {
    const { userId } = await auth();
    if (!userId) return errorResponse(UNAUTHORIZED);
  }

  const { slug } = await params;

  // Use service client since RLS restricts orgs to platform_admin
  const serviceClient = createServiceClient();

  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .select('id, name, slug, status, timezone, locale, metadata')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (orgError || !org) return errorResponse(notFound('Organization'));

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

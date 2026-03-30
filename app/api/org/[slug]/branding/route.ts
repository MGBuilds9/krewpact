import { NextResponse } from 'next/server';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactOrgId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';
import { brandingSchema } from '@/lib/validators/branding';

const ALLOWED_ROLES = ['platform_admin', 'executive'];

export const GET = withApiRoute({ roles: ALLOWED_ROLES }, async ({ params }) => {
  const { slug } = params;
  const serviceClient = createServiceClient();

  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (orgError || !org) throw notFound('Organization');

  const callerOrgId = await getKrewpactOrgId();
  if (callerOrgId && callerOrgId !== org.id) throw forbidden('You do not belong to this organization');

  const { data: settings, error } = await serviceClient
    .from('org_settings')
    .select('branding')
    .eq('org_id', org.id)
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json({ branding: settings?.branding ?? {} });
});

export const PATCH = withApiRoute(
  { roles: ALLOWED_ROLES, bodySchema: brandingSchema },
  async ({ params, body }) => {
    const { slug } = params;
    const serviceClient = createServiceClient();

    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (orgError || !org) throw notFound('Organization');

    const callerOrgId = await getKrewpactOrgId();
    if (callerOrgId && callerOrgId !== org.id) throw forbidden('You do not belong to this organization');

    const { data: existing } = await serviceClient
      .from('org_settings')
      .select('branding')
      .eq('org_id', org.id)
      .single();

    const merged = { ...(existing?.branding ?? {}), ...(body as Record<string, unknown>) };

    const { error } = await serviceClient
      .from('org_settings')
      .upsert({ org_id: org.id, branding: merged }, { onConflict: 'org_id' });

    if (error) throw dbError(error.message);

    return NextResponse.json({ branding: merged });
  },
);

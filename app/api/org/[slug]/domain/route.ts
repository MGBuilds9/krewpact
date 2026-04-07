import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactOrgId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';
import { addCustomDomain, removeCustomDomain } from '@/lib/tenant/domains';

const ALLOWED_ROLES = ['platform_admin'];

const domainBodySchema = z.object({
  domain: z.string().min(4).max(253),
});

const domainQuerySchema = z.object({
  domain: z.string().min(4).max(253),
});

export const POST = withApiRoute(
  { roles: ALLOWED_ROLES, bodySchema: domainBodySchema },
  async ({ params, body, logger }) => {
    const { slug } = params;
    const { domain } = body as z.infer<typeof domainBodySchema>;
    const serviceClient = createServiceClient();

    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (orgError || !org) throw notFound('Organization');

    const callerOrgId = await getKrewpactOrgId();
    if (callerOrgId && callerOrgId !== org.id)
      throw forbidden('You do not belong to this organization');

    const result = await addCustomDomain(domain);
    if (!result.success) {
      logger.error('Failed to add custom domain via Vercel', { domain, error: result.error });
      return NextResponse.json({ error: result.error ?? 'Failed to add domain' }, { status: 502 });
    }

    const { error: updateError } = await serviceClient
      .from('organizations')
      .update({ custom_domain: domain })
      .eq('id', org.id);

    if (updateError) {
      logger.error('DB update failed after Vercel domain add, rolling back', { domain });
      await removeCustomDomain(domain).catch(() => {});
      throw dbError(updateError.message);
    }

    return NextResponse.json({ custom_domain: domain });
  },
);

export const DELETE = withApiRoute(
  { roles: ALLOWED_ROLES, querySchema: domainQuerySchema },
  async ({ params, query, logger }) => {
    const { slug } = params;
    const { domain } = query as z.infer<typeof domainQuerySchema>;
    const serviceClient = createServiceClient();

    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (orgError || !org) throw notFound('Organization');

    const callerOrgId = await getKrewpactOrgId();
    if (callerOrgId && callerOrgId !== org.id)
      throw forbidden('You do not belong to this organization');

    const { error: updateError } = await serviceClient
      .from('organizations')
      .update({ custom_domain: null })
      .eq('id', org.id);

    if (updateError) throw dbError(updateError.message);

    const result = await removeCustomDomain(domain);
    if (!result.success) {
      logger.warn('Vercel domain removal failed after DB clear, manual cleanup needed', {
        domain,
        error: result.error,
      });
    }

    return NextResponse.json({ custom_domain: null });
  },
);

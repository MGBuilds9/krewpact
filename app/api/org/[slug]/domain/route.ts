import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
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

    const result = await addCustomDomain(domain);
    if (!result.success) {
      logger.error('Failed to add custom domain via Vercel', { domain, error: result.error });
      return NextResponse.json({ error: result.error ?? 'Failed to add domain' }, { status: 502 });
    }

    const { error: updateError } = await serviceClient
      .from('organizations')
      .update({ custom_domain: domain })
      .eq('id', org.id);

    if (updateError) throw dbError(updateError.message);

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

    const result = await removeCustomDomain(domain);
    if (!result.success) {
      logger.error('Failed to remove custom domain via Vercel', { domain, error: result.error });
      return NextResponse.json({ error: result.error ?? 'Failed to remove domain' }, { status: 502 });
    }

    const { error: updateError } = await serviceClient
      .from('organizations')
      .update({ custom_domain: null })
      .eq('id', org.id);

    if (updateError) throw dbError(updateError.message);

    return NextResponse.json({ custom_domain: null });
  },
);

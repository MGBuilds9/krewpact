import { NextResponse } from 'next/server';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { subscriptionUpdateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export const GET = withApiRoute({}, async ({ params, logger: _logger }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: executive or platform_admin role required');
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('executive_subscriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw notFound('Subscription');
  }

  return NextResponse.json({ data });
});

export const PATCH = withApiRoute(
  { bodySchema: subscriptionUpdateSchema },
  async ({ body, params, logger: _logger }) => {
    const { id } = params;

    const roles = await getKrewpactRoles();
    const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
    if (!hasAccess) {
      throw forbidden('Forbidden: platform_admin role required');
    }

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('executive_subscriptions')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw notFound('Subscription');
    }

    return NextResponse.json({ data });
  },
);

export const DELETE = withApiRoute({}, async ({ params, logger }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: platform_admin role required');
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Check existence first
  const { data: existing } = await supabase
    .from('executive_subscriptions')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    throw notFound('Subscription');
  }

  const { error } = await supabase.from('executive_subscriptions').delete().eq('id', id);

  if (error) {
    logger.error('Failed to delete subscription', { message: error.message });
    throw dbError('Failed to delete subscription');
  }

  return new NextResponse(null, { status: 204 });
});

import { NextResponse } from 'next/server';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactRoles, getOrgIdFromAuth } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { subscriptionUpdateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export const GET = withApiRoute({}, async ({ params, logger }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: executive or platform_admin role required');
  }

  const orgId = await getOrgIdFromAuth();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('executive_subscriptions')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    throw notFound('Subscription');
  }

  return NextResponse.json({ data });
});

export const PATCH = withApiRoute({}, async ({ req, params, logger }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: platform_admin role required');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = subscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = await getOrgIdFromAuth();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('executive_subscriptions')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error || !data) {
    throw notFound('Subscription');
  }

  return NextResponse.json({ data });
});

export const DELETE = withApiRoute({}, async ({ params, logger }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: platform_admin role required');
  }

  const orgId = await getOrgIdFromAuth();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Check existence first
  const { data: existing } = await supabase
    .from('executive_subscriptions')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (!existing) {
    throw notFound('Subscription');
  }

  const { error } = await supabase
    .from('executive_subscriptions')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) {
    logger.error('Failed to delete subscription', { message: error.message });
    throw dbError('Failed to delete subscription');
  }

  return new NextResponse(null, { status: 204 });
});

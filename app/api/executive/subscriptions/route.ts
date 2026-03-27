import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactRoles, getOrgIdFromAuth } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { subscriptionCreateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export const GET = withApiRoute({}, async ({ req, logger }) => {
  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: executive or platform_admin role required');
  }

  const orgId = await getOrgIdFromAuth();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const isActiveParam = searchParams.get('is_active');
  const category = searchParams.get('category');

  let query = supabase.from('executive_subscriptions').select('*').eq('org_id', orgId);

  if (isActiveParam !== null) {
    query = query.eq('is_active', isActiveParam === 'true');
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    logger.error('Failed to fetch subscriptions', { message: error.message });
    throw dbError('Failed to fetch subscriptions');
  }

  return NextResponse.json({ data });
});

export const POST = withApiRoute({}, async ({ req, logger }) => {
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

  const parsed = subscriptionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = await getOrgIdFromAuth();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('executive_subscriptions')
    .insert({ ...parsed.data, org_id: orgId })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create subscription', { message: error.message });
    throw dbError('Failed to create subscription');
  }

  return NextResponse.json({ data }, { status: 201 });
});

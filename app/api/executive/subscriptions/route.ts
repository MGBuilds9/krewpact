import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles, getOrgIdFromAuth } from '@/lib/api/org';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { subscriptionCreateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: executive or platform_admin role required' },
      { status: 403 },
    );
  }

  try {
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
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    logger.error('Subscriptions GET error', { message: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: platform_admin role required' }, { status: 403 });
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

  try {
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
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    logger.error('Subscriptions POST error', { message: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

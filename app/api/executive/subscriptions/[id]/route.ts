import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { subscriptionUpdateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  const hasAccess = roles.some((r: unknown) => READ_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: executive or platform_admin role required' },
      { status: 403 },
    );
  }

  try {
    const orgId = await getOrgIdFromAuth();
    const supabase = await createUserClient();

    const { data, error } = await supabase
      .from('executive_subscriptions')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    logger.error('Subscription GET error', { message: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  const hasAccess = roles.some((r: unknown) => WRITE_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: platform_admin role required' }, { status: 403 });
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

  try {
    const orgId = await getOrgIdFromAuth();
    const supabase = await createUserClient();

    const { data, error } = await supabase
      .from('executive_subscriptions')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    logger.error('Subscription PATCH error', { message: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  const hasAccess = roles.some((r: unknown) => WRITE_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: platform_admin role required' }, { status: 403 });
  }

  try {
    const orgId = await getOrgIdFromAuth();
    const supabase = await createUserClient();

    // Check existence first
    const { data: existing } = await supabase
      .from('executive_subscriptions')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('executive_subscriptions')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      logger.error('Failed to delete subscription', { message: error.message });
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    logger.error('Subscription DELETE error', { message: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

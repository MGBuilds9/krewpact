import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { portalAccountInviteSchema } from '@/lib/validators/portals';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  status: z.string().optional(),
  actor_type: z.enum(['client', 'trade_partner']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status, actor_type, limit = 50, offset = 0 } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('portal_accounts')
    .select(
      'id, clerk_user_id, contact_name, email, phone, company_name, actor_type, status, invited_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (actor_type) query = query.eq('actor_type', actor_type);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = portalAccountInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { projects, role, ...accountData } = parsed.data;

  const supabase = await createUserClient();
  const { data: account, error: accountError } = await supabase
    .from('portal_accounts')
    .insert({ ...accountData, status: 'invited' })
    .select()
    .single();

  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 });

  // 1. Link projects if any
  if (projects && projects.length > 0) {
    const permissions = projects.map((projectId) => ({
      portal_account_id: account.id,
      project_id: projectId,
      permission_set: {},
    }));
    const { error: permError } = await supabase.from('portal_permissions').insert(permissions);
    if (permError) logger.error('Failed to link projects:', { error: permError });
  }

  // 2. Invite via Clerk
  try {
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();

    await client.invitations.createInvitation({
      emailAddress: account.email,
      notify: true,
      publicMetadata: {
        krewpact_user_id: account.id,
        krewpact_roles: role ? [role] : ['client_owner'],
        krewpact_divisions: [],
      },
    });
  } catch (err: unknown) {
    logger.error('Failed to invite via Clerk:', { error: err });
    return NextResponse.json({ ...account, _warning: 'Clerk invite failed' }, { status: 201 });
  }

  return NextResponse.json(account, { status: 201 });
}

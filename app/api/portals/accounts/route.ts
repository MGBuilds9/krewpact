import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { portalAccountInviteSchema } from '@/lib/validators/portals';

const querySchema = z.object({
  status: z.string().optional(),
  actor_type: z.enum(['client', 'trade_partner']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const { status, actor_type, limit = 50, offset = 0 } = query as z.infer<typeof querySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let q = supabase
    .from('portal_accounts')
    .select(
      'id, clerk_user_id, contact_name, email, phone, company_name, actor_type, status, invited_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) q = q.eq('status', status);
  if (actor_type) q = q.eq('actor_type', actor_type);

  const { data, error, count } = await q;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute({ bodySchema: portalAccountInviteSchema }, async ({ body }) => {
  const { projects, role, ...accountData } = body as z.infer<typeof portalAccountInviteSchema>;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: account, error: accountError } = await supabase
    .from('portal_accounts')
    .insert({ ...accountData, status: 'invited' })
    .select()
    .single();

  if (accountError) throw dbError(accountError.message);

  // 1. Link projects if any
  if (projects && projects.length > 0) {
    const permissions = projects.map((projectId: string) => ({
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
        role_keys: role ? [role] : ['client_owner'],
        division_ids: [],
      },
    });
  } catch (err: unknown) {
    logger.error('Failed to invite via Clerk:', { error: err });
    return NextResponse.json({ ...account, _warning: 'Clerk invite failed' }, { status: 201 });
  }

  return NextResponse.json(account, { status: 201 });
});

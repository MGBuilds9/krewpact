import { clerkClient } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

const ALLOWED_ROLES = ['platform_admin'];

const CANONICAL_ROLES = [
  'platform_admin',
  'executive',
  'operations_manager',
  'project_manager',
  'project_coordinator',
  'estimator',
  'field_supervisor',
  'accounting',
  'payroll_admin',
  'client_owner',
  'client_delegate',
  'trade_partner_admin',
  'trade_partner_user',
] as const;

const assignSchema = z.object({
  user_id: z.string().min(1),
  role_keys: z.array(z.enum(CANONICAL_ROLES)).min(0),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { user_id, role_keys } = parsed.data;

  try {
    const client = await clerkClient();
    const targetUser = await client.users.getUser(user_id);

    const currentMeta = (targetUser.publicMetadata ?? {}) as Record<string, unknown>;
    await client.users.updateUserMetadata(user_id, {
      publicMetadata: { ...currentMeta, role_keys },
    });

    logger.info('User roles updated', {
      target_user_id: user_id,
      role_keys,
      updated_by: userId,
    });

    return NextResponse.json({
      ok: true,
      user_id,
      role_keys,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update roles';
    logger.error('Failed to update Clerk user roles', {
      target_user_id: user_id,
      error: err instanceof Error ? err : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

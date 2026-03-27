import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { portalMessageSchema } from '@/lib/validators/portals';

const querySchema = z.object({
  portal_account_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  format: z.enum(['json']).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/**
 * GET /api/portals/messages
 * Returns message thread for a portal account or project context.
 * Portal users automatically see only their own messages.
 * Internal staff can query any portal_account_id or project_id.
 */
export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const {
    portal_account_id,
    project_id,
    direction,
    limit = 50,
    offset = 0,
  } = query as z.infer<typeof querySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let q = supabase
    .from('portal_messages')
    .select(
      'id, project_id, portal_account_id, sender_user_id, direction, subject, body, read_at, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (portal_account_id) q = q.eq('portal_account_id', portal_account_id);
  if (project_id) q = q.eq('project_id', project_id);
  if (direction) q = q.eq('direction', direction);

  const { data, error, count } = await q;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

/**
 * POST /api/portals/messages
 * Creates a new message. Sets direction based on caller:
 * - Portal users (have a portal_accounts row with clerk_user_id) → 'inbound'
 * - Internal staff → 'outbound'
 */
export const POST = withApiRoute({ bodySchema: portalMessageSchema }, async ({ userId, body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Determine if caller is a portal user or internal staff
  const { data: portalAccount } = await supabase
    .from('portal_accounts')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  const isPortalUser = !!portalAccount;
  const direction = isPortalUser ? 'inbound' : 'outbound';

  // Build the message payload
  const messagePayload: Record<string, unknown> = {
    ...(body as Record<string, unknown>),
    direction,
  };

  if (isPortalUser) {
    messagePayload.portal_account_id = portalAccount.id;
    messagePayload.sender_user_id = null;
  } else {
    // Try to resolve internal user ID from users table
    const { data: internalUser } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();
    messagePayload.sender_user_id = internalUser?.id ?? null;
  }

  const { data, error } = await supabase
    .from('portal_messages')
    .insert(messagePayload)
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});

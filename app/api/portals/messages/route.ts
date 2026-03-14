import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { portalMessageSchema } from '@/lib/validators/portals';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

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
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { portal_account_id, project_id, direction, limit = 50, offset = 0 } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('portal_messages')
    .select(
      'id, project_id, portal_account_id, sender_user_id, direction, subject, body, read_at, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (portal_account_id) query = query.eq('portal_account_id', portal_account_id);
  if (project_id) query = query.eq('project_id', project_id);
  if (direction) query = query.eq('direction', direction);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

/**
 * POST /api/portals/messages
 * Creates a new message. Sets direction based on caller:
 * - Portal users (have a portal_accounts row with clerk_user_id) → 'inbound'
 * - Internal staff → 'outbound'
 */
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

  const parsed = portalMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

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
    ...parsed.data,
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

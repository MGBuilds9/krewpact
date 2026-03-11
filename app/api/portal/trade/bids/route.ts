import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const bidSchema = z.object({
  project_id: z.string().uuid(),
  bid_amount: z.number().positive(),
  scope_summary: z.string().min(10).max(2000),
  notes: z.string().optional(),
});

async function resolveTradePortalAccount(
  userId: string,
  supabase: Awaited<ReturnType<typeof createUserClient>>,
) {
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id, status, actor_type')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa || pa.actor_type !== 'trade_partner' || pa.status !== 'active') return null;
  return pa;
}

/**
 * GET /api/portal/trade/bids
 * Returns bids submitted by this trade partner.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveTradePortalAccount(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  // Bids stored in proposals table with source_portal_id = portal account
  const {
    data: bids,
    error,
    count,
  } = await supabase
    .from('proposals')
    .select('id, opportunity_id, status, total_amount, notes, created_at, updated_at', {
      count: 'exact',
    })
    .contains('metadata', { source_portal_id: pa.id })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(paginatedResponse(bids, count, limit, offset));
}

/**
 * POST /api/portal/trade/bids
 * Submits a new bid/proposal from the trade portal.
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

  const parsed = bidSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const pa = await resolveTradePortalAccount(userId, supabase);
  if (!pa) return NextResponse.json({ error: 'Trade partner access only' }, { status: 403 });

  // Find the opportunity tied to this project
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id')
    .eq('metadata->>project_id', parsed.data.project_id)
    .single();

  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      opportunity_id: opportunity?.id ?? null,
      status: 'draft',
      total_amount: parsed.data.bid_amount,
      notes: `${parsed.data.scope_summary}${parsed.data.notes ? '\n\n' + parsed.data.notes : ''}`,
      metadata: {
        source_portal_id: pa.id,
        project_id: parsed.data.project_id,
        bid_type: 'trade_portal',
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(proposal, { status: 201 });
}

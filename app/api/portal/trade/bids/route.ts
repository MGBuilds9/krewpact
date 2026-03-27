import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError,forbidden } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';

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
export const GET = withApiRoute({}, async ({ req, userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveTradePortalAccount(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

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

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(bids, count, limit, offset));
});

/**
 * POST /api/portal/trade/bids
 * Submits a new bid/proposal from the trade portal.
 */
export const POST = withApiRoute({ bodySchema: bidSchema }, async ({ userId, body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const pa = await resolveTradePortalAccount(userId, supabase);
  if (!pa) throw forbidden('Trade partner access only');

  // Find the opportunity tied to this project
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('id')
    .eq('metadata->>project_id', body.project_id)
    .single();

  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      opportunity_id: opportunity?.id ?? null,
      status: 'draft',
      total_amount: body.bid_amount,
      notes: `${body.scope_summary}${body.notes ? '\n\n' + body.notes : ''}`,
      metadata: {
        source_portal_id: pa.id,
        project_id: body.project_id,
        bid_type: 'trade_portal',
      },
    })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(proposal, { status: 201 });
});

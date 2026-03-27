import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch the bid
  const { data: bid, error: bidError } = await supabase
    .from('bidding_opportunities')
    .select('*')
    .eq('id', id)
    .single();

  if (bidError) {
    const status = bidError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: bidError.message }, { status });
  }

  if (bid.opportunity_id) {
    return NextResponse.json(
      { error: 'Bid is already linked to an opportunity', opportunity_id: bid.opportunity_id },
      { status: 409 },
    );
  }

  // Build opportunity payload from bid fields
  const opportunityPayload = {
    opportunity_name: bid.title,
    division_id: bid.division_id ?? undefined,
    estimated_revenue: bid.estimated_value ?? undefined,
    target_close_date: bid.deadline ?? undefined,
    stage: 'intake',
  };

  // Create the opportunity
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .insert(opportunityPayload)
    .select('id')
    .single();

  if (oppError) {
    logger.error('Failed to create opportunity from bid', {
      message: oppError.message,
      code: oppError.code,
    });
    return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 });
  }

  // Link bid back to new opportunity
  const { error: linkError } = await supabase
    .from('bidding_opportunities')
    .update({ opportunity_id: opportunity.id })
    .eq('id', id);

  if (linkError) {
    logger.error('Created opportunity but failed to link bid', { message: linkError.message });
  }

  return NextResponse.json({ opportunity_id: opportunity.id }, { status: 201 });
}

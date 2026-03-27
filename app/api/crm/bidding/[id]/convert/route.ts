import { NextResponse } from 'next/server';

import { dbError, notFound, serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const POST = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' } },
  async ({ params, logger }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Fetch the bid
    const { data: bid, error: bidError } = await supabase
      .from('bidding_opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (bidError) {
      if (bidError.code === 'PGRST116') throw notFound('Bidding opportunity');
      throw dbError(bidError.message);
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
      throw serverError('Failed to create opportunity');
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
  },
);

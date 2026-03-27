import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const linkSchema = z.object({
  opportunity_id: z.string().uuid(),
});

export const POST = withApiRoute(
  { bodySchema: linkSchema, rateLimit: { limit: 30, window: '1 m' } },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Verify opportunity exists
    const { data: opp, error: oppError } = await supabase
      .from('opportunities')
      .select('id')
      .eq('id', body.opportunity_id)
      .single();

    if (oppError || !opp) throw notFound('Opportunity');

    const { data, error } = await supabase
      .from('bidding_opportunities')
      .update({ opportunity_id: body.opportunity_id })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Bidding opportunity');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { linkedEstimateCreateSchema } from '@/lib/validators/crm';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: oppError } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .single();

  if (oppError) {
    if (oppError.code === 'PGRST116') throw notFound('Opportunity');
    throw dbError(oppError.message);
  }

  const { data, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, total_amount, status')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  if (error) throw dbError(error.message);

  return NextResponse.json(data);
});

export const POST = withApiRoute(
  { bodySchema: linkedEstimateCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('id, division_id')
      .eq('id', id)
      .single();

    if (oppError) {
      if (oppError.code === 'PGRST116') throw notFound('Opportunity');
      throw dbError(oppError.message);
    }

    const oppData = opportunity as Record<string, unknown>;

    const { data, error } = await supabase
      .from('estimates')
      .insert({
        ...(body as z.infer<typeof linkedEstimateCreateSchema>),
        opportunity_id: id,
        division_id: oppData.division_id as string | null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);

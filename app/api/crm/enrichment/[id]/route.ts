import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('enrichment_jobs')
    .select('id, lead_id, status, source, result, error_message, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Enrichment job');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const POST = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' } },
  async ({ params }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('enrichment_jobs')
      .update({
        status: 'pending',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, lead_id, status, source, result, error_message, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Enrichment job');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

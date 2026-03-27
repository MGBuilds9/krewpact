import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const POST = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' } },
  async ({ params }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { error: fetchError } = await supabase
      .from('webhook_events')
      .select(
        'id, provider, event_id, event_type, payload, received_at, processed_at, processing_status, processing_error',
      )
      .eq('id', id)
      .single();

    if (fetchError) throw dbError(fetchError.message);

    const { data, error } = await supabase
      .from('webhook_events')
      .update({ status: 'queued', attempts: 0, last_error: null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

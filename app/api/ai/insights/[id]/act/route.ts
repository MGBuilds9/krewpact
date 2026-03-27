import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const PATCH = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' } },
  async ({ params, userId }) => {
    const { id } = params;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { error } = await supabase
      .from('ai_insights')
      .update({ acted_on_at: new Date().toISOString(), acted_on_by: userId })
      .eq('id', id);

    if (error) throw dbError(error.message);

    return NextResponse.json({ success: true });
  },
);

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  entity_type: z.enum(['lead', 'opportunity', 'project', 'account', 'task']),
  entity_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('ai_insights')
    .select(
      'id, insight_type, title, content, confidence, action_url, action_label, metadata, created_at',
    )
    .eq('entity_type', query.entity_type)
    .eq('entity_id', query.entity_id)
    .is('dismissed_at', null)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .gte('confidence', 0.7)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ insights: data ?? [] });
});

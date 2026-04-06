import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async ({ userId }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('user_digests')
    .select('id, digest_date, sections, summary, email_sent_at, read_at, created_at')
    .eq('user_id', userId)
    .eq('digest_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('digest fetch failed', { userId, error });
    return NextResponse.json({ error: 'Failed to load digest' }, { status: 500 });
  }

  if (data && !data.read_at) {
    await supabase
      .from('user_digests')
      .update({ read_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  return NextResponse.json({ digest: data ?? null });
});

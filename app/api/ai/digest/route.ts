import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('user_digests')
    .select('id, digest_date, sections, summary, email_sent_at, read_at, created_at')
    .eq('user_id', userId)
    .eq('digest_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    // Not found is OK
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && !data.read_at) {
    // Mark as read
    await supabase
      .from('user_digests')
      .update({ read_at: new Date().toISOString() })
      .eq('id', data.id);
  }

  return NextResponse.json({ digest: data ?? null });
}

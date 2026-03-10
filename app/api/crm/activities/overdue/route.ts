import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { getKrewpactUserId } from '@/lib/api/org';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createUserClient();
  const now = new Date().toISOString();

  const { data, error, count } = await supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('owner_user_id', krewpactUserId)
    .lt('due_at', now)
    .is('completed_at', null)
    .order('due_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
  });
}

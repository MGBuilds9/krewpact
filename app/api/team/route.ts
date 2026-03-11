import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Query users who have active user_divisions entries (left_at IS NULL)
  let query = supabase
    .from('users')
    .select('*, user_divisions!inner(division_id, is_primary, left_at)')
    .is('user_divisions.left_at', null)
    .order('first_name')
    .limit(300);

  if (parsed.data.division_id) {
    query = query.eq('user_divisions.division_id', parsed.data.division_id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Client-side search filtering
  let filtered = data || [];
  if (parsed.data.search) {
    const term = parsed.data.search.toLowerCase();
    filtered = filtered.filter(
      (u: Record<string, unknown>) =>
        (u.first_name as string)?.toLowerCase().includes(term) ||
        (u.last_name as string)?.toLowerCase().includes(term) ||
        (u.email as string)?.toLowerCase().includes(term),
    );
  }

  return NextResponse.json(filtered);
}

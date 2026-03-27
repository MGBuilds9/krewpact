import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  search: z.string().optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const { division_id, search } = query as { division_id?: string; search?: string };
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  // Query users — left join on user_divisions so users without assignments still appear
  let dbQuery = supabase
    .from('users')
    .select('*, user_divisions(division_id, is_primary, left_at)')
    .order('first_name')
    .limit(300);

  if (division_id) {
    // When filtering by division, use inner join to only show users in that division
    dbQuery = supabase
      .from('users')
      .select('*, user_divisions!inner(division_id, is_primary, left_at)')
      .eq('user_divisions.division_id', division_id)
      .is('user_divisions.left_at', null)
      .order('first_name')
      .limit(300);
  }

  const { data, error } = await dbQuery;
  if (error) throw dbError(error.message);

  // Client-side search filtering
  let filtered = data || [];
  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (u: Record<string, unknown>) =>
        (u.first_name as string)?.toLowerCase().includes(term) ||
        (u.last_name as string)?.toLowerCase().includes(term) ||
        (u.email as string)?.toLowerCase().includes(term),
    );
  }

  return NextResponse.json(filtered);
});

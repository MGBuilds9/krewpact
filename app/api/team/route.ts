import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createUserClient();
    let query = supabase
      .from('users')
      .select('*')
      .eq('is_internal', true)
      .order('first_name');

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Client-side search filtering (Supabase text search is limited)
    let filtered = data || [];
    if (parsed.data.search) {
      const term = parsed.data.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.first_name?.toLowerCase().includes(term) ||
          u.last_name?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term),
      );
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Team GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

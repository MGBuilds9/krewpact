import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  role_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { role_type, limit = 50, offset = 0 } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('roles')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('role_name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (role_type) query = query.eq('role_type', role_type);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

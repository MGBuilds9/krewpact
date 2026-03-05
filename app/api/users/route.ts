import { auth } from '@clerk/nextjs/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const supabase = await createUserClient();

  const { data, error, count } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, avatar_url, status', { count: 'exact' })
    .order('first_name')
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

import { auth } from '@clerk/nextjs/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createUserClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, avatar_url, status')
    .order('first_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

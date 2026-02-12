import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userIdParam = req.nextUrl.searchParams.get('user_id');
  if (!userIdParam) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('user_divisions')
    .select(`
      *,
      divisions (
        id,
        name,
        code,
        description,
        is_active,
        manager_id,
        settings,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userIdParam)
    .is('left_at', null)
    .order('is_primary', { ascending: false })
    .order('joined_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to DivisionWithRole format
  const divisions = data
    ?.filter((ud: Record<string, unknown>) => ud.divisions)
    .map((ud: Record<string, unknown>) => {
      const div = ud.divisions as Record<string, unknown>;
      return {
        ...div,
        code: div.code ?? null,
        user_role: (ud.role as string) || 'worker',
        is_primary: (ud.is_primary as boolean) || false,
      };
    }) || [];

  return NextResponse.json(divisions);
}

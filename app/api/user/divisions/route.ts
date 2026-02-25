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
      id,
      user_id,
      division_id,
      is_primary,
      joined_at,
      left_at,
      divisions (
        id,
        name,
        description,
        active,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userIdParam)
    .is('left_at', null)
    .order('is_primary', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user's primary role for role display
  const { data: roleData } = await supabase.rpc('get_user_role_names', { p_user_id: userIdParam });
  const primaryRoleName = (roleData as { role_name: string; is_primary: boolean }[] | null)?.[0]?.role_name || 'worker';

  // Transform to DivisionWithRole format
  const divisions = data
    ?.filter((ud: Record<string, unknown>) => ud.divisions)
    .map((ud: Record<string, unknown>) => {
      const div = ud.divisions as Record<string, unknown>;
      return {
        ...div,
        code: div.id ?? null, // division_id IS the code (e.g., 'contracting')
        is_active: (div.active as boolean) ?? true,
        manager_id: null,
        settings: null,
        user_role: primaryRoleName,
        is_primary: (ud.is_primary as boolean) || false,
      };
    }) || [];

  return NextResponse.json(divisions);
}

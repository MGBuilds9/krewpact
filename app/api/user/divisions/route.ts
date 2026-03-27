import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ req }) => {
  const userIdParam = req.nextUrl.searchParams.get('user_id');
  if (!userIdParam) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_divisions')
    .select(
      `
        id,
        user_id,
        division_id,
        is_primary,
        joined_at,
        left_at,
        divisions (
          id,
          code,
          name,
          description,
          is_active,
          settings,
          created_at,
          updated_at
        )
      `,
    )
    .eq('user_id', userIdParam)
    .is('left_at', null)
    .order('is_primary', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: roleData } = await supabase.rpc('get_user_role_names', {
    p_user_id: userIdParam,
  });
  const primaryRoleName =
    (roleData as { role_name: string; is_primary: boolean }[] | null)?.[0]?.role_name || 'worker';

  const divisions =
    data
      ?.filter((ud: Record<string, unknown>) => ud.divisions)
      .map((ud: Record<string, unknown>) => {
        const div = ud.divisions as Record<string, unknown>;
        return {
          ...div,
          manager_id: null,
          user_role: primaryRoleName,
          is_primary: (ud.is_primary as boolean) || false,
        };
      }) || [];

  return NextResponse.json(divisions);
});

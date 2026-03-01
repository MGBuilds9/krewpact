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

  // Fetch roles, permissions, and division IDs in parallel
  const [rolesResult, permissionsResult, divisionsResult] = await Promise.all([
    supabase.rpc('get_user_role_names', { p_user_id: userIdParam }),
    supabase.rpc('get_user_permissions', { p_user_id: userIdParam }),
    supabase
      .from('user_divisions')
      .select('division_id')
      .eq('user_id', userIdParam),
  ]);

  if (rolesResult.error || permissionsResult.error || divisionsResult.error) {
    const errorMsg =
      rolesResult.error?.message ||
      permissionsResult.error?.message ||
      divisionsResult.error?.message ||
      'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  const roles = (rolesResult.data || []) as { role_name: string; is_primary: boolean }[];
  const permissions = (permissionsResult.data || []).map(
    (r: { permission_name: string }) => r.permission_name,
  );
  const divisionIds = (divisionsResult.data || [])
    .map((d: { division_id: string | null }) => d.division_id)
    .filter(Boolean) as string[];

  return NextResponse.json({ roles, permissions, divisionIds });
}

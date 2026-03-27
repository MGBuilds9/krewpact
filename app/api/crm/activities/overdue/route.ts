import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async () => {
  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) throw forbidden('Unauthorized');

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const now = new Date().toISOString();

  const { data, error, count } = await supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('owner_user_id', krewpactUserId)
    .lt('due_at', now)
    .is('completed_at', null)
    .order('due_at', { ascending: true });

  if (error) throw dbError(error.message);

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
  });
});

import { NextResponse } from 'next/server';

import { dbError,forbidden } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * POST /api/portals/messages/[id]/read
 * Marks a message as read for the calling portal user.
 * Idempotent — safe to call multiple times.
 */
export const POST = withApiRoute({}, async ({ userId, params }) => {
  const messageId = params.id;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Resolve portal account for this user
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa) throw forbidden('Portal account not found');

  // Update read_at only if it's not already set (idempotent)
  const { data, error } = await supabase
    .from('portal_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('portal_account_id', pa.id)
    .is('read_at', null) // Only mark unread → read
    .select()
    .maybeSingle();

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true, message: data });
});

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

/**
 * POST /api/portals/messages/[id]/read
 * Marks a message as read for the calling portal user.
 * Idempotent — safe to call multiple times.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { id: messageId } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Resolve portal account for this user
  const { data: pa } = await supabase
    .from('portal_accounts')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (!pa) {
    return NextResponse.json({ error: 'Portal account not found' }, { status: 403 });
  }

  // Update read_at only if it's not already set (idempotent)
  const { data, error } = await supabase
    .from('portal_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('portal_account_id', pa.id)
    .is('read_at', null) // Only mark unread → read
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, message: data });
}

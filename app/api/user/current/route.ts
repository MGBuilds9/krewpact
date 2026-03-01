import { auth, currentUser } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc('ensure_clerk_user', {
    p_clerk_id: clerkUser.id,
    p_email: clerkUser.primaryEmailAddress?.emailAddress || '',
    p_first_name: clerkUser.firstName || '',
    p_last_name: clerkUser.lastName || '',
    p_avatar_url: clerkUser.imageUrl || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // RPC returns array — extract single user record
  const user = Array.isArray(data) ? data[0] : data;
  if (!user) {
    return NextResponse.json({ error: 'User record not created' }, { status: 500 });
  }

  return NextResponse.json(user);
}

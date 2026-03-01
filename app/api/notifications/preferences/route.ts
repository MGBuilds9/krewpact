import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { notificationPreferenceUpdateSchema } from '@/lib/validators/org';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? {
    in_app_enabled: true,
    email_enabled: true,
    push_enabled: false,
    quiet_hours: null,
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = notificationPreferenceUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ ...parsed.data, clerk_user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'clerk_user_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

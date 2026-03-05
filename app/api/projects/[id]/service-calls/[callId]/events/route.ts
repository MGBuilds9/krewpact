import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { serviceEventCreateSchema } from '@/lib/validators/closeout';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; callId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { callId } = await params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const supabase = await createUserClient();
  const { data, error, count } = await supabase
    .from('service_call_events')
    .select('id, service_call_id, event_type, actor_user_id, actor_portal_id, created_at' /* excluded from list: event_payload */, { count: 'exact' })
    .eq('service_call_id', callId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; callId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { callId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = serviceEventCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('service_call_events')
    .insert({ ...parsed.data, service_call_id: callId, created_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

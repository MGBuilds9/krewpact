import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { rfiThreadCreateSchema } from '@/lib/validators/field-ops';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string; rfiId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { rfiId } = await context.params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const supabase = await createUserClient();

  const { data, error, count } = await supabase
    .from('rfi_threads')
    .select('id, rfi_id, author_user_id, message_text, is_official_response, created_at', { count: 'exact' })
    .eq('rfi_id', rfiId)
    .order('created_at')
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rfiId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = rfiThreadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('rfi_threads')
    .insert({ ...parsed.data, rfi_id: rfiId, author_user_id: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-update RFI status to 'responded' when official response posted
  if (parsed.data.is_official_response) {
    await supabase
      .from('rfi_items')
      .update({ status: 'responded' })
      .eq('id', rfiId)
      .eq('status', 'open');
  }

  return NextResponse.json(data, { status: 201 });
}

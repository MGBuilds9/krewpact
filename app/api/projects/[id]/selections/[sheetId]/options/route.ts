import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { selectionOptionSchema } from '@/lib/validators/selections';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { sheetId } = await params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('selection_options')
    .select(
      'id, selection_sheet_id, option_group, option_name, allowance_amount, upgrade_amount, sort_order, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('selection_sheet_id', sheetId)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sheetId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = selectionOptionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('selection_options')
    .insert({ ...parsed.data, selection_sheet_id: sheetId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

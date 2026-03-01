import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rfiThreadCreateSchema } from '@/lib/validators/field-ops';

type RouteContext = { params: Promise<{ id: string; rfiId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rfiId } = await context.params;
  const supabase = await createUserClient();

  const { data, error, count } = await supabase
    .from('rfi_threads')
    .select('*', { count: 'exact' })
    .eq('rfi_id', rfiId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data: data ?? [], total, hasMore: false });
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

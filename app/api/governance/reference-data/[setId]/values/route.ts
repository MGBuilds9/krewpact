import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { referenceDataValueSchema } from '@/lib/validators/governance';

const querySchema = z.object({
  is_active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { setId } = await params;
  const qp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(qp);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { is_active, limit = 100, offset = 0 } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('reference_data_values')
    .select('*', { count: 'exact' })
    .eq('data_set_id', setId)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (is_active !== undefined) query = query.eq('is_active', is_active);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { setId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = referenceDataValueSchema.safeParse({ ...body as Record<string, unknown>, data_set_id: setId });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('reference_data_values')
    .insert({ ...parsed.data, is_active: parsed.data.is_active ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { costCatalogItemCreateSchema } from '@/lib/validators/estimating';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  item_type: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id, item_type, search, limit, offset, sort_by, sort_dir } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('cost_catalog_items')
    .select('*', { count: 'exact' })
    .order(sort_by ?? 'item_name', { ascending: sort_dir !== 'desc' });

  if (division_id) query = query.eq('division_id', division_id);
  if (item_type) query = query.eq('item_type', item_type);
  if (search) query = query.ilike('item_name', `%${search}%`);

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;
  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = costCatalogItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('cost_catalog_items')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rfqInviteSchema } from '@/lib/validators/procurement';

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rfqId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rfqId } = await params;
  const qp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(qp);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { limit, offset } = parsed.data;
  const supabase = await createUserClient();
  const { data, error, count } = await supabase
    .from('rfq_invites')
    .select('*', { count: 'exact' })
    .eq('rfq_id', rfqId)
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rfqId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rfqId } = await params;
  const body = await req.json();
  const parsed = rfqInviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('rfq_invites')
    .insert({ ...parsed.data, rfq_id: rfqId, invited_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

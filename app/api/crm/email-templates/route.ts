import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const categoryEnum = z.enum(['outreach', 'follow_up', 'nurture', 'event', 'referral']);

const getQuerySchema = z.object({
  category: categoryEnum.optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: categoryEnum,
  subject: z.string().min(1).max(200),
  body_html: z.string().min(1),
  body_text: z.string().optional().nullable(),
  merge_fields: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  division_id: z.string().uuid().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = getQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  let query = supabase
    .from('email_templates')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false });

  if (parsed.data.category) {
    query = query.eq('category', parsed.data.category);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('email_templates')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

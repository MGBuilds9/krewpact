import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { entityTagSchema } from '@/lib/validators/crm';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

const getQuerySchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
});

const deleteQuerySchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
  tag_id: z.string().uuid(),
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

  const { entity_type, entity_id } = parsed.data;
  const supabase = await createUserClient();

  const { data, error } = await supabase
    .from('entity_tags')
    .select('id, tag_id, entity_type, entity_id, tags(*)')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('id', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
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

  const parsed = entityTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('entity_tags')
    .insert(parsed.data)
    .select('id, tag_id, entity_type, entity_id, tags(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = deleteQuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { entity_type, entity_id, tag_id } = parsed.data;
  const supabase = await createUserClient();

  const { error } = await supabase
    .from('entity_tags')
    .delete()
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .eq('tag_id', tag_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { safetyFormUpdateSchema } from '@/lib/validators/safety';

type RouteContext = { params: Promise<{ id: string; formId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, formId } = await context.params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = safetyFormUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('safety_forms')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', formId)
    .eq('project_id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, formId } = await context.params;
  const supabase = await createUserClient();

  const { error } = await supabase
    .from('safety_forms')
    .delete()
    .eq('id', formId)
    .eq('project_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

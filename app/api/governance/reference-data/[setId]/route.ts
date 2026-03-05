import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { referenceDataSetSchema } from '@/lib/validators/governance';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { setId } = await params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('reference_data_sets')
    .select('id, set_key, set_name, status, created_at, updated_at')
    .eq('id', setId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { setId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = referenceDataSetSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('reference_data_sets')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', setId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

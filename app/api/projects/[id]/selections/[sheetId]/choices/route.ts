import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { selectionChoiceSchema } from '@/lib/validators/selections';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; sheetId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sheetId } = await params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('selection_choices')
    .select('*')
    .eq('selection_sheet_id', sheetId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; sheetId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sheetId } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = selectionChoiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('selection_choices')
    .upsert({ ...parsed.data, selection_sheet_id: sheetId, chosen_by: userId, chosen_at: new Date().toISOString() }, { onConflict: 'selection_sheet_id,selection_option_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

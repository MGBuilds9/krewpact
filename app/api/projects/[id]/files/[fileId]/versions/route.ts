import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { fileVersionSchema } from '@/lib/validators/documents';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = await context.params;
  const supabase = await createUserClient();

  const { data, error, count } = await supabase
    .from('file_versions')
    .select('*', { count: 'exact' })
    .eq('file_id', fileId)
    .order('version_no', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data: data ?? [], total, hasMore: false });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = fileVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();

  // Get current max version_no
  const { data: existing } = await supabase
    .from('file_versions')
    .select('version_no')
    .eq('file_id', fileId)
    .order('version_no', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (existing?.version_no ?? 0) + 1;

  const { data, error } = await supabase
    .from('file_versions')
    .insert({ ...parsed.data, file_id: fileId, version_no: nextVersion, uploaded_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update version_no on file_metadata
  await supabase
    .from('file_metadata')
    .update({ version_no: nextVersion })
    .eq('id', fileId);

  return NextResponse.json(data, { status: 201 });
}

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';
import { fileVersionSchema } from '@/lib/validators/documents';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { fileId } = await context.params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('file_versions')
    .select(
      'id, file_id, version_no, file_path, storage_bucket, checksum_sha256, change_note, uploaded_by, created_at',
      { count: 'exact' },
    )
    .eq('file_id', fileId)
    .order('version_no', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
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

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

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
  await supabase.from('file_metadata').update({ version_no: nextVersion }).eq('id', fileId);

  return NextResponse.json(data, { status: 201 });
}

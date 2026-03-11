import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { fileMetadataCreateSchema } from '@/lib/validators/documents';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folder_id');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  let query = supabase
    .from('file_metadata')
    .select(
      'id, filename, original_filename, file_path, file_size_bytes, mime_type, folder_id, project_id, storage_bucket, tags, visibility, version_no, is_deleted, deleted_at, uploaded_by, created_at, updated_at' /* excluded from list: checksum_sha256, source_system, source_identifier */,
      { count: 'exact' },
    )
    .eq('project_id', id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (folderId) query = query.eq('folder_id', folderId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = fileMetadataCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('file_metadata')
    .insert({ ...parsed.data, project_id: id, uploaded_by: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

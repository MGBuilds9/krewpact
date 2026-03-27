import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { fileMetadataCreateSchema } from '@/lib/validators/documents';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const folderId = req.nextUrl.searchParams.get('folder_id');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  let query = supabase
    .from('file_metadata')
    .select(
      'id, filename, original_filename, file_path, file_size_bytes, mime_type, folder_id, project_id, storage_bucket, tags, visibility, version_no, is_deleted, deleted_at, uploaded_by, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (folderId) query = query.eq('folder_id', folderId);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: fileMetadataCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('file_metadata')
      .insert({ ...body, project_id: id, uploaded_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);

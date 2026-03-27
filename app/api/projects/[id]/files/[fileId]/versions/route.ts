import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { fileVersionSchema } from '@/lib/validators/documents';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { fileId } = params;
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

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: fileVersionSchema },
  async ({ params, body, userId }) => {
    const { fileId } = params;
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
      .insert({ ...body, file_id: fileId, version_no: nextVersion, uploaded_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    // Update version_no on file_metadata
    await supabase.from('file_metadata').update({ version_no: nextVersion }).eq('id', fileId);

    return NextResponse.json(data, { status: 201 });
  },
);

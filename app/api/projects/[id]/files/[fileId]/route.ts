import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { fileMetadataUpdateSchema } from '@/lib/validators/documents';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, fileId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('file_metadata')
    .select(
      'id, filename, original_filename, file_path, file_size_bytes, mime_type, folder_id, project_id, storage_bucket, tags, visibility, version_no, is_deleted, deleted_at, checksum_sha256, source_system, source_identifier, uploaded_by, created_at, updated_at',
    )
    .eq('id', fileId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('File');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: fileMetadataUpdateSchema },
  async ({ params, body }) => {
    const { id, fileId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('file_metadata')
      .update(body)
      .eq('id', fileId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('File');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, fileId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Soft delete
  const { error } = await supabase
    .from('file_metadata')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('project_id', id);

  if (error) throw dbError(error.message);

  return new NextResponse(null, { status: 204 });
});

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { fileMetadataUpdateSchema } from '@/lib/validators/documents';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string; fileId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, fileId } = await context.params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('file_metadata')
    .select('id, filename, original_filename, file_path, file_size_bytes, mime_type, folder_id, project_id, storage_bucket, tags, visibility, version_no, is_deleted, deleted_at, checksum_sha256, source_system, source_identifier, uploaded_by, created_at, updated_at')
    .eq('id', fileId)
    .eq('project_id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = fileMetadataUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('file_metadata')
    .update(parsed.data)
    .eq('id', fileId)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, fileId } = await context.params;
  const supabase = await createUserClient();

  // Soft delete
  const { error } = await supabase
    .from('file_metadata')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .eq('project_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

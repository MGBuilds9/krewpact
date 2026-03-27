import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import {
  deleteAttachment,
  getAttachmentSignedUrl,
  listAttachments,
  uploadAttachment,
} from '@/lib/services/document-control';
import { createUserClientSafe } from '@/lib/supabase/server';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validators/document-control';

type RouteContext = { params: Promise<{ id: string; rfiId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, rfiId } = await context.params;

  // Verify RFI belongs to project (RLS enforced)
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: rfiError } = await supabase
    .from('rfi_items')
    .select('id')
    .eq('id', rfiId)
    .eq('project_id', id)
    .single();

  if (rfiError) {
    const status = rfiError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: 'RFI not found' }, { status });
  }

  try {
    const attachments = await listAttachments('rfi', rfiId);

    // Attach signed URLs for downloads
    const withUrls = await Promise.all(
      attachments.map(async (a) => ({
        ...a,
        downloadUrl: await getAttachmentSignedUrl(a.storage_path),
      })),
    );

    return NextResponse.json({ data: withUrls, total: withUrls.length });
  } catch (err: unknown) {
    logger.error('[rfi-attachments] GET failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to list attachments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, rfiId } = await context.params;

  // Verify RFI belongs to project
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: rfiError } = await supabase
    .from('rfi_items')
    .select('id')
    .eq('id', rfiId)
    .eq('project_id', id)
    .single();

  if (rfiError) {
    const status = rfiError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: 'RFI not found' }, { status });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 400 });
  }

  const mimeOk = (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type);
  if (!mimeOk) {
    return NextResponse.json({ error: 'File type not permitted' }, { status: 400 });
  }

  try {
    const result = await uploadAttachment(file, 'rfi', rfiId, userId);
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    logger.error('[rfi-attachments] POST upload failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rfiId } = await context.params;
  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get('attachmentId');

  if (!attachmentId) {
    return NextResponse.json({ error: 'Missing attachmentId param' }, { status: 400 });
  }

  // Verify attachment belongs to this RFI
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: attError } = await supabase
    .from('document_attachments')
    .select('id')
    .eq('id', attachmentId)
    .eq('entity_type', 'rfi')
    .eq('entity_id', rfiId)
    .is('deleted_at', null)
    .single();

  if (attError) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
  }

  try {
    await deleteAttachment(attachmentId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    logger.error('[rfi-attachments] DELETE failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

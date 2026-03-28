import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import {
  deleteAttachment,
  getAttachmentSignedUrl,
  listAttachments,
  uploadAttachment,
} from '@/lib/services/document-control';
import { createUserClientSafe } from '@/lib/supabase/server';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validators/document-control';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, rfiId } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: rfiError } = await supabase
    .from('rfi_items')
    .select('id')
    .eq('id', rfiId)
    .eq('project_id', id)
    .single();

  if (rfiError) {
    if (rfiError.code === 'PGRST116') throw notFound('RFI');
    throw dbError(rfiError.message);
  }

  const attachments = await listAttachments('rfi', rfiId);
  const withUrls = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      downloadUrl: await getAttachmentSignedUrl(a.storage_path),
    })),
  );

  return NextResponse.json({ data: withUrls, total: withUrls.length });
});

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' } },
  async ({ req, params, userId }) => {
    const { id, rfiId } = params;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { error: rfiError } = await supabase
      .from('rfi_items')
      .select('id')
      .eq('id', rfiId)
      .eq('project_id', id)
      .single();

    if (rfiError) {
      if (rfiError.code === 'PGRST116') throw notFound('RFI');
      throw dbError(rfiError.message);
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

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({ error: 'File type not permitted' }, { status: 400 });
    }

    const result = await uploadAttachment(file, 'rfi', rfiId, userId);
    return NextResponse.json(result, { status: 201 });
  },
);

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  const { rfiId } = params;
  const attachmentId = req.nextUrl.searchParams.get('attachmentId');

  if (!attachmentId) {
    return NextResponse.json({ error: 'Missing attachmentId param' }, { status: 400 });
  }

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

  if (attError) throw notFound('Attachment');

  await deleteAttachment(attachmentId);
  return NextResponse.json({ ok: true });
});

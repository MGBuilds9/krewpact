import { NextResponse } from 'next/server';

import { notFound,serverError } from '@/lib/api/errors';
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
  const { id, subId } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: subError } = await supabase
    .from('submittals')
    .select('id')
    .eq('id', subId)
    .eq('project_id', id)
    .single();

  if (subError) {
    if (subError.code === 'PGRST116') throw notFound('Submittal');
    throw serverError('Failed to verify submittal');
  }

  const attachments = await listAttachments('submittal', subId);

  const withUrls = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      downloadUrl: await getAttachmentSignedUrl(a.storage_path),
    })),
  );

  return NextResponse.json({ data: withUrls, total: withUrls.length });
});

export const POST = withApiRoute({}, async ({ req, params, userId }) => {
  const { id, subId } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: subError } = await supabase
    .from('submittals')
    .select('id')
    .eq('id', subId)
    .eq('project_id', id)
    .single();

  if (subError) {
    if (subError.code === 'PGRST116') throw notFound('Submittal');
    throw serverError('Failed to verify submittal');
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

  const result = await uploadAttachment(file, 'submittal', subId, userId);
  return NextResponse.json(result, { status: 201 });
});

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  const { subId } = params;
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
    .eq('entity_type', 'submittal')
    .eq('entity_id', subId)
    .is('deleted_at', null)
    .single();

  if (attError) {
    throw notFound('Attachment');
  }

  await deleteAttachment(attachmentId);
  return NextResponse.json({ ok: true });
});

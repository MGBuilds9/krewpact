import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.storage
    .from('contracts')
    .list(`opportunity-attachments/${id}`);

  if (error) throw dbError(error.message);

  const files = await Promise.all(
    (data ?? [])
      .filter((f) => f.name !== '.emptyFolderPlaceholder')
      .map(async (f) => {
        const path = `opportunity-attachments/${id}/${f.name}`;
        const { data: signedData } = await supabase.storage
          .from('contracts')
          .createSignedUrl(path, 3600);
        return {
          name: f.name,
          path,
          size: f.metadata?.size ?? null,
          created_at: f.created_at,
          updated_at: f.updated_at,
          signed_url: signedData?.signedUrl ?? null,
        };
      }),
  );

  return NextResponse.json({ files });
});

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' } },
  async ({ req, params }) => {
    const { id } = params;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_FORM_DATA', message: 'Invalid form data' } },
        { status: 400 },
      );
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: { code: 'MISSING_FILE', message: 'No file provided' } },
        { status: 400 },
      );
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'File too large. Maximum size is 10MB.' } },
        { status: 400 },
      );
    }

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const path = `opportunity-attachments/${id}/${file.name}`;
    const { data, error } = await supabase.storage
      .from('contracts')
      .upload(path, file, { upsert: true });

    if (error) throw dbError(error.message);

    const { data: signedData } = await supabase.storage
      .from('contracts')
      .createSignedUrl(path, 3600);

    return NextResponse.json(
      {
        path: data.path,
        name: file.name,
        size: file.size,
        signed_url: signedData?.signedUrl ?? null,
      },
      { status: 201 },
    );
  },
);

export const DELETE = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const fileName = req.nextUrl.searchParams.get('fileName');

  if (!fileName) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'fileName query parameter is required' } },
      { status: 400 },
    );
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const path = `opportunity-attachments/${id}/${fileName}`;
  const { error } = await supabase.storage.from('contracts').remove([path]);
  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});

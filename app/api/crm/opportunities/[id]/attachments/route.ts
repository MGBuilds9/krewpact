import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.storage
    .from('documents')
    .list(`opportunity-attachments/${id}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build file metadata with public URLs
  const files = (data ?? [])
    .filter((f) => f.name !== '.emptyFolderPlaceholder')
    .map((f) => {
      const path = `opportunity-attachments/${id}/${f.name}`;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      return {
        name: f.name,
        path,
        size: f.metadata?.size ?? null,
        created_at: f.created_at,
        updated_at: f.updated_at,
        public_url: urlData.publicUrl,
      };
    });

  return NextResponse.json({ files });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Limit file size to 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const path = `opportunity-attachments/${id}/${file.name}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

  return NextResponse.json(
    {
      path: data.path,
      name: file.name,
      size: file.size,
      public_url: urlData.publicUrl,
    },
    { status: 201 },
  );
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const url = new URL(req.url);
  const fileName = url.searchParams.get('fileName');

  if (!fileName) {
    return NextResponse.json({ error: 'fileName query parameter is required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const path = `opportunity-attachments/${id}/${fileName}`;

  const { error } = await supabase.storage.from('documents').remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

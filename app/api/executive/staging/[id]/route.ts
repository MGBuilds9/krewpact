import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { stagingUpdateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  const hasAccess = roles.some((r: unknown) => READ_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: executive or platform_admin role required' },
      { status: 403 },
    );
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  const hasAccess = roles.some((r: unknown) => WRITE_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: platform_admin role required' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = stagingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.status === 'approved' || parsed.data.status === 'rejected') {
    updatePayload.reviewed_by = (claims.krewpact_user_id as string) || null;
    updatePayload.reviewed_at = new Date().toISOString();
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const claims = sessionClaims as Record<string, unknown>;
  const roles = Array.isArray(claims?.krewpact_roles) ? claims.krewpact_roles : [];
  const hasAccess = roles.some((r: unknown) => WRITE_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: platform_admin role required' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const supabase = await createServiceClient();
  const { error } = await supabase.from('knowledge_staging').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

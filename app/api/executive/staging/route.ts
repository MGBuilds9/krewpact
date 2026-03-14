import { auth } from '@clerk/nextjs/server';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { stagingCreateSchema } from '@/lib/validators/executive';
import { createHash } from 'crypto';
import { getKrewpactRoles, getOrgIdFromAuth } from '@/lib/api/org';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: executive or platform_admin role required' },
      { status: 403 },
    );
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending_review';
  const category = searchParams.get('category');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;

  const orgId = await getOrgIdFromAuth();
  const supabase = await createServiceClient();

  let query = supabase
    .from('knowledge_staging')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch staging documents' }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
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

  const parsed = stagingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = await getOrgIdFromAuth();
  const content_checksum = createHash('sha256').update(parsed.data.raw_content).digest('hex');

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .insert({ ...parsed.data, org_id: orgId, content_checksum, status: 'pending_review' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create staging document' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

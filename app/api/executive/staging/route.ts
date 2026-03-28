import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';
import { stagingCreateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

// Single-org app — org_id scoping is redundant; RLS handles data isolation.
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || 'e076c9b9-72ce-4fdc-a031-e5808e73d92c';

export const GET = withApiRoute({}, async ({ req }) => {
  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: executive or platform_admin role required');
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending_review';
  const category = searchParams.get('category');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;

  const supabase = await createServiceClient();

  let query = supabase
    .from('knowledge_staging')
    .select('*', { count: 'exact' });

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
    throw dbError('Failed to fetch staging documents');
  }

  return NextResponse.json({ data, total: count, page, limit });
});

export const POST = withApiRoute({ bodySchema: stagingCreateSchema }, async ({ body }) => {
  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: platform_admin role required');
  }

  const content_checksum = createHash('sha256').update(body.raw_content).digest('hex');

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .insert({ ...body, org_id: DEFAULT_ORG_ID, content_checksum, status: 'pending_review' })
    .select()
    .single();

  if (error) {
    throw dbError('Failed to create staging document');
  }

  return NextResponse.json(data, { status: 201 });
});

import { NextResponse } from 'next/server';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactRoles, getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createServiceClient } from '@/lib/supabase/server';
import { stagingUpdateSchema } from '@/lib/validators/executive';

const READ_ROLES = ['executive', 'platform_admin'];
const WRITE_ROLES = ['platform_admin'];

export const GET = withApiRoute({}, async ({ params, orgId }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => READ_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: executive or platform_admin role required');
  }

  if (!orgId) return NextResponse.json({ error: 'Organization context required' }, { status: 500 });

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    throw notFound('Document');
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: stagingUpdateSchema }, async ({ body, params, orgId }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: platform_admin role required');
  }

  if (!orgId) return NextResponse.json({ error: 'Organization context required' }, { status: 500 });

  const updatePayload: Record<string, unknown> = { ...body };

  if (body.status === 'approved' || body.status === 'rejected') {
    const krewpactUserId = await getKrewpactUserId();
    updatePayload.reviewed_by = krewpactUserId || null;
    updatePayload.reviewed_at = new Date().toISOString();
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('knowledge_staging')
    .update(updatePayload)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error || !data) {
    throw dbError('Failed to update document');
  }

  return NextResponse.json(data);
});

export const DELETE = withApiRoute({}, async ({ params, orgId }) => {
  const { id } = params;

  const roles = await getKrewpactRoles();
  const hasAccess = roles.some((r) => WRITE_ROLES.includes(r));
  if (!hasAccess) {
    throw forbidden('Forbidden: platform_admin role required');
  }

  if (!orgId) return NextResponse.json({ error: 'Organization context required' }, { status: 500 });

  const supabase = await createServiceClient();
  const { error } = await supabase.from('knowledge_staging').delete().eq('id', id).eq('org_id', orgId);

  if (error) {
    throw dbError('Failed to delete document');
  }

  return NextResponse.json({ success: true });
});

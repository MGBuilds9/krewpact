import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { closeoutPackageUpdateSchema } from '@/lib/validators/closeout';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id: projectId, pkgId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('closeout_packages')
    .select(
      'id, project_id, status, checklist_payload, accepted_at, created_by, created_at, updated_at',
    )
    .eq('id', pkgId)
    .eq('project_id', projectId)
    .single();

  if (error) throw notFound('Closeout package');
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: closeoutPackageUpdateSchema },
  async ({ params, body }) => {
    const { id: projectId, pkgId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('closeout_packages')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', pkgId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

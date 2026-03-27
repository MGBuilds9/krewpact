import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { deficiencyItemUpdateSchema } from '@/lib/validators/closeout';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id: projectId, defId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('deficiency_items')
    .select(
      'id, project_id, closeout_package_id, title, details, status, severity, assigned_to, due_at, closed_at, created_at, updated_at',
    )
    .eq('id', defId)
    .eq('project_id', projectId)
    .single();

  if (error) throw notFound('Deficiency');
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: deficiencyItemUpdateSchema },
  async ({ params, body }) => {
    const { id: projectId, defId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('deficiency_items')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', defId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

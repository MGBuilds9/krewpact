import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rfqPackageUpdateSchema } from '@/lib/validators/procurement';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id: projectId, rfqId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('rfq_packages')
    .select(
      'id, project_id, rfq_number, title, scope_summary, due_at, status, created_by, created_at, updated_at',
    )
    .eq('id', rfqId)
    .eq('project_id', projectId)
    .single();

  if (error) throw notFound('RFQ');
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: rfqPackageUpdateSchema },
  async ({ params, body }) => {
    const { id: projectId, rfqId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('rfq_packages')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', rfqId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

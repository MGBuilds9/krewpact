import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { safetyFormUpdateSchema } from '@/lib/validators/safety';

export const PATCH = withApiRoute(
  { bodySchema: safetyFormUpdateSchema },
  async ({ params, body }) => {
    const { id, formId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('safety_forms')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', formId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, formId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('safety_forms')
    .delete()
    .eq('id', formId)
    .eq('project_id', id);

  if (error) throw dbError(error.message);

  return new NextResponse(null, { status: 204 });
});

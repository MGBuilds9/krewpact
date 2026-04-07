import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateAlternateUpdateSchema } from '@/lib/validators/estimating';

export const PATCH = withApiRoute(
  { bodySchema: estimateAlternateUpdateSchema },
  async ({ body, params }) => {
    const { id, altId } = params;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('estimate_alternates')
      .update(body)
      .eq('id', altId)
      .eq('estimate_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 500 },
      );
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, altId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('estimate_alternates')
    .delete()
    .eq('id', altId)
    .eq('estimate_id', id);

  if (error) {
    throw dbError(error.message);
  }

  return NextResponse.json({ success: true });
});

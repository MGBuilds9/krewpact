import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { referenceDataSetSchema } from '@/lib/validators/governance';

export const GET = withApiRoute({}, async ({ params }) => {
  const { setId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('reference_data_sets')
    .select('id, set_key, set_name, status, created_at, updated_at')
    .eq('id', setId)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: referenceDataSetSchema.partial() },
  async ({ params, body }) => {
    const { setId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('reference_data_sets')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', setId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

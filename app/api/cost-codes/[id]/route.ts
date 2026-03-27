import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { costCodeUpdateSchema } from '@/lib/validators/procurement';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('cost_code_dictionary')
    .select(
      'id, division_id, cost_code, cost_code_name, parent_cost_code_id, is_active, metadata, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: costCodeUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('cost_code_dictionary')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

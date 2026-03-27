import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { sequenceUpdateSchema } from '@/lib/validators/crm';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('sequences')
    .select(
      'id, name, description, trigger_type, trigger_conditions, division_id, is_active, created_at, updated_at, sequence_steps(*)',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Sequence');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PUT = withApiRoute({ bodySchema: sequenceUpdateSchema }, async ({ params, body }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('sequences')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Sequence');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('sequences').delete().eq('id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});

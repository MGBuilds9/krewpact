import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateAllowanceUpdateSchema } from '@/lib/validators/estimating';

export const PATCH = withApiRoute({}, async ({ req, params }) => {
  const { id, allowId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = estimateAllowanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('estimate_allowances')
    .update(parsed.data)
    .eq('id', allowId)
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
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, allowId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('estimate_allowances')
    .delete()
    .eq('id', allowId)
    .eq('estimate_id', id);

  if (error) {
    throw dbError(error.message);
  }

  return NextResponse.json({ success: true });
});

import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { divisionUpdateSchema } from '@/lib/validators/org';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, code, description, is_active, settings, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: divisionUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { data, error } = await supabase
      .from('divisions')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

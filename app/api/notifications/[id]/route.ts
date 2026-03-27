import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const updateSchema = z.object({
  state: z.enum(['read']).optional(),
});

export const PATCH = withApiRoute({ bodySchema: updateSchema }, async ({ params, body }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const updateData: Record<string, unknown> = { ...body };
  if (body.state === 'read') {
    updateData.read_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw dbError(error.message);
  return NextResponse.json({ success: true });
});

import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id: projectId, warId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('warranty_items')
    .select(
      'id, project_id, deficiency_id, title, provider_name, warranty_start, warranty_end, terms, created_at, updated_at',
    )
    .eq('id', warId)
    .eq('project_id', projectId)
    .single();

  if (error) throw notFound('Warranty item');

  return NextResponse.json(data);
});

export const PATCH = withApiRoute({}, async ({ req, params }) => {
  const { id: projectId, warId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('warranty_items')
    .update({ ...(body as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', warId)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data);
});

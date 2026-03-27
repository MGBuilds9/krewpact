import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateTemplateUpdateSchema } from '@/lib/validators/estimating';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('estimate_templates')
    .select(
      'id, template_name, project_type, division_id, is_default, payload, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Estimate template');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: estimateTemplateUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('estimate_templates')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Estimate template');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('estimate_templates').delete().eq('id', id);
  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});

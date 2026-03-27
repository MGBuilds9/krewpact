import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateTemplateCreateSchema } from '@/lib/validators/estimating';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  project_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { division_id, project_type, limit, offset } = querySchema.parse(params);
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('estimate_templates')
    .select(
      'id, template_name, project_type, division_id, is_default, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('template_name', { ascending: true });

  if (division_id) query = query.eq('division_id', division_id);
  if (project_type) query = query.eq('project_type', project_type);

  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
});

export const POST = withApiRoute({ bodySchema: estimateTemplateCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('estimate_templates').insert(body).select().single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { serviceCallCreateSchema } from '@/lib/validators/closeout';

const querySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { id: projectId } = params;
  const status = req.nextUrl.searchParams.get('status');
  const priority = req.nextUrl.searchParams.get('priority');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('service_calls')
    .select(
      'id, project_id, warranty_item_id, call_number, title, description, priority, status, requested_by_portal_id, assigned_to, opened_at, resolved_at, closed_at, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: serviceCallCreateSchema },
  async ({ params, body, userId }) => {
    const { id: projectId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('service_calls')
      .insert({ ...body, project_id: projectId, status: 'open', created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);

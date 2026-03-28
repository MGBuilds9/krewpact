import { NextResponse } from 'next/server';
import { z } from 'zod';

import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { poSnapshotSchema } from '@/lib/validators/finance';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

const querySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'received', 'closed', 'cancelled']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const createSchema = poSnapshotSchema.extend({
  project_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema, roles: FINANCE_ROLES }, async ({ req, query }) => {
  const { project_id, status } = query as z.infer<typeof querySchema>;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let dbQuery = supabase
    .from('po_snapshots')
    /* excluded from list: snapshot_payload */
    .select(
      'id, project_id, po_number, supplier_name, po_date, status, subtotal_amount, tax_amount, total_amount, erp_docname, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (project_id) dbQuery = dbQuery.eq('project_id', project_id);
  if (status) dbQuery = dbQuery.eq('status', status);

  const { data, error, count } = await dbQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: createSchema, roles: FINANCE_ROLES }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('po_snapshots')
    .insert(body as z.infer<typeof createSchema>)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
});

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { migrationConflictResolutionSchema } from '@/lib/validators/migration';

const querySchema = z.object({
  resolution_status: z.string().optional(),
  entity_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { id: batchId } = params;
  const {
    resolution_status,
    entity_type,
    limit = 50,
    offset = 0,
  } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('migration_conflicts')
    /* excluded from list: conflict_payload */
    .select(
      'id, record_id, conflict_type, resolution_status, resolved_by, resolved_at, resolution_notes, created_at',
      { count: 'exact' },
    )
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (resolution_status) query = query.eq('resolution_status', resolution_status);
  if (entity_type) query = query.eq('entity_type', entity_type);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const PATCH = withApiRoute(
  { bodySchema: migrationConflictResolutionSchema },
  async ({ req, params, body, userId }) => {
    const { id: batchId } = params;
    const conflictId = req.nextUrl.searchParams.get('conflict_id');
    if (!conflictId) return NextResponse.json({ error: 'conflict_id required' }, { status: 400 });

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('migration_conflicts')
      .update({ ...body, resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq('id', conflictId)
      .eq('batch_id', batchId)
      .select(
        'id, record_id, conflict_type, conflict_payload, resolution_status, resolved_by, resolved_at, resolution_notes, created_at',
      )
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

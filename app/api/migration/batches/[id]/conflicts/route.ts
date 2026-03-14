import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { migrationConflictResolutionSchema } from '@/lib/validators/migration';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  resolution_status: z.string().optional(),
  entity_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { id: batchId } = await params;
  const qp = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(qp);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { resolution_status, entity_type, limit = 50, offset = 0 } = parsed.data;
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { id: batchId } = await params;
  const conflictId = req.nextUrl.searchParams.get('conflict_id');
  if (!conflictId) return NextResponse.json({ error: 'conflict_id required' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = migrationConflictResolutionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('migration_conflicts')
    .update({ ...parsed.data, resolved_by: userId, resolved_at: new Date().toISOString() })
    .eq('id', conflictId)
    .eq('batch_id', batchId)
    .select(
      'id, record_id, conflict_type, conflict_payload, resolution_status, resolved_by, resolved_at, resolution_notes, created_at',
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

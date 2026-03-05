import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { auditLogQuerySchema } from '@/lib/validators/system';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = auditLogQuerySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    entity_type,
    entity_id,
    actor_user_id,
    action,
    from_date,
    to_date,
    limit = 50,
    offset = 0,
  } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('audit_logs')
    /* excluded from list: old_data, new_data, context */
    .select('id, entity_type, entity_id, action, actor_user_id, actor_portal_id, ip_address, user_agent, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + (limit ?? 50) - 1);

  if (entity_type) query = query.eq('entity_type', entity_type);
  if (entity_id) query = query.eq('entity_id', entity_id);
  if (actor_user_id) query = query.eq('actor_user_id', actor_user_id);
  if (action) query = query.eq('action', action);
  if (from_date) query = query.gte('created_at', from_date);
  if (to_date) query = query.lte('created_at', to_date);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + (limit ?? 50) < total });
}

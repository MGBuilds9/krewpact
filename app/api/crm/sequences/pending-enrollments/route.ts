import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ req }) => {
  const { searchParams } = req.nextUrl;
  const divisionId = searchParams.get('division_id');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)));
  const offset = (page - 1) * pageSize;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('sequence_enrollments')
    .select(
      `
      id,
      sequence_id,
      lead_id,
      contact_id,
      status,
      current_step,
      current_step_id,
      next_step_at,
      trigger_type,
      trigger_event,
      enrolled_at,
      leads ( id, first_name, last_name, company, stage, division_id ),
      outreach_sequences ( id, name, division_id )
    `,
      { count: 'exact' },
    )
    .eq('status', 'pending_review')
    .order('enrolled_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (divisionId) {
    query = query.eq('outreach_sequences.division_id', divisionId);
  }

  const { data, error, count } = await query;

  if (error) throw dbError(error.message);

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      page_size: pageSize,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    },
  });
});

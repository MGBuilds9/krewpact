import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const divisionId = searchParams.get('division_id');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)));
  const offset = (page - 1) * pageSize;

  const supabase = await createUserClient();

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
    // Filter via sequence's division_id using a subquery approach
    query = query.eq('outreach_sequences.division_id', divisionId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch pending enrollments', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      page_size: pageSize,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}

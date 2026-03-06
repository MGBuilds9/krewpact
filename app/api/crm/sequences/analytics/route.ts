import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export interface SequenceAnalytics {
  sequence_id: string;
  sequence_name: string;
  is_active: boolean;
  total_steps: number;
  enrollments: {
    active: number;
    completed: number;
    paused: number;
    failed: number;
    total: number;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const divisionId = req.nextUrl.searchParams.get('divisionId');
  const supabase = await createUserClient();

  // Fetch sequences with step count
  let seqQuery = supabase
    .from('outreach_sequences')
    .select('id, name, is_active, sequence_steps(id)')
    .order('created_at', { ascending: false });

  if (divisionId) {
    seqQuery = seqQuery.eq('division_id', divisionId);
  }

  const { data: sequences, error: seqError } = await seqQuery;
  if (seqError) {
    return NextResponse.json({ error: seqError.message }, { status: 500 });
  }

  if (!sequences || sequences.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const seqIds = sequences.map((s) => s.id);

  // Fetch all enrollments for these sequences
  const { data: enrollments, error: enrollError } = await supabase
    .from('sequence_enrollments')
    .select('sequence_id, status')
    .in('sequence_id', seqIds);

  if (enrollError) {
    return NextResponse.json({ error: enrollError.message }, { status: 500 });
  }

  // Aggregate enrollment counts per sequence
  const countMap: Record<string, Record<string, number>> = {};
  for (const e of enrollments ?? []) {
    if (!countMap[e.sequence_id]) {
      countMap[e.sequence_id] = { active: 0, completed: 0, paused: 0, failed: 0 };
    }
    const status = e.status as string;
    if (status in countMap[e.sequence_id]) {
      countMap[e.sequence_id][status]++;
    }
  }

  const analytics: SequenceAnalytics[] = sequences.map((seq) => {
    const counts = countMap[seq.id] ?? { active: 0, completed: 0, paused: 0, failed: 0 };
    return {
      sequence_id: seq.id,
      sequence_name: seq.name,
      is_active: seq.is_active,
      total_steps: Array.isArray(seq.sequence_steps) ? seq.sequence_steps.length : 0,
      enrollments: {
        ...counts,
        total: counts.active + counts.completed + counts.paused + counts.failed,
      },
    };
  });

  return NextResponse.json({ data: analytics });
}

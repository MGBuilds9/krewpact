import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

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

type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'failed';

function aggregateEnrollments(enrollments: Array<{ sequence_id: string; status: string }>) {
  const countMap: Record<
    string,
    { active: number; completed: number; paused: number; failed: number }
  > = {};
  for (const e of enrollments) {
    if (!countMap[e.sequence_id]) {
      countMap[e.sequence_id] = { active: 0, completed: 0, paused: 0, failed: 0 };
    }
    const status = e.status as EnrollmentStatus;
    if (
      status === 'active' ||
      status === 'completed' ||
      status === 'paused' ||
      status === 'failed'
    ) {
      countMap[e.sequence_id][status]++;
    }
  }
  return countMap;
}

export const GET = withApiRoute({}, async ({ req }) => {
  const divisionId = req.nextUrl.searchParams.get('divisionId');
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let seqQuery = supabase
    .from('sequences')
    .select('id, name, is_active, sequence_steps(id)')
    .order('created_at', { ascending: false });
  if (divisionId) seqQuery = seqQuery.eq('division_id', divisionId);

  const { data: sequences, error: seqError } = await seqQuery;
  if (seqError) throw dbError(seqError.message);
  if (!sequences?.length) return NextResponse.json({ data: [] });

  const seqIds = sequences.map((s) => s.id);
  const { data: enrollments, error: enrollError } = await supabase
    .from('sequence_enrollments')
    .select('sequence_id, status')
    .in('sequence_id', seqIds);

  if (enrollError) throw dbError(enrollError.message);

  const countMap = aggregateEnrollments(enrollments ?? []);

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
});

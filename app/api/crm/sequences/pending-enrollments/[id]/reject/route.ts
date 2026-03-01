import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rejectEnrollment } from '@/lib/crm/enrollment-engine';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing enrollment id' }, { status: 400 });
  }

  const supabase = await createUserClient();

  const result = await rejectEnrollment(supabase, id);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Failed to reject enrollment', detail: result.error },
      { status: 500 },
    );
  }

  const { data: enrollment, error: fetchError } = await supabase
    .from('sequence_enrollments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !enrollment) {
    return NextResponse.json(
      { error: 'Enrollment rejected but failed to fetch updated record', detail: fetchError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: enrollment });
}

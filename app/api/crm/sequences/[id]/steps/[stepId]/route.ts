import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string; stepId: string }> };

export async function DELETE(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, stepId } = await context.params;
  const supabase = await createUserClient();
  const { error } = await supabase
    .from('sequence_steps')
    .delete()
    .eq('id', stepId)
    .eq('sequence_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

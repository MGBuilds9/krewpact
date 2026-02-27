import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { batchId } = await context.params;
  const supabase = await createUserClient();

  const { data, error } = await supabase
    .from('timesheet_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { batchId } = await context.params;
  const supabase = await createUserClient();

  const { error } = await supabase
    .from('timesheet_batches')
    .delete()
    .eq('id', batchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

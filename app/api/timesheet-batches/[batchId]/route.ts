import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { batchId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('timesheet_batches')
    .select(
      'id, division_id, period_start, period_end, status, submitted_by, approved_by, exported_at, adp_export_reference, created_at, updated_at',
    )
    .eq('id', batchId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { batchId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('timesheet_batches').delete().eq('id', batchId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}

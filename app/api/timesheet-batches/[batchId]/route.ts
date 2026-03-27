import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { batchId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('timesheet_batches')
    .select(
      'id, division_id, period_start, period_end, status, submitted_by, approved_by, exported_at, adp_export_reference, created_at, updated_at',
    )
    .eq('id', batchId)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { batchId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('timesheet_batches').delete().eq('id', batchId);
  if (error) throw dbError(error.message);

  return new NextResponse(null, { status: 204 });
});

import { NextResponse } from 'next/server';

import { notFound,serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createDistributionLog, getDistributionLog } from '@/lib/services/document-control';
import { createUserClientSafe } from '@/lib/supabase/server';
import { distributionLogCreateSchema } from '@/lib/validators/document-control';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, subId } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: subError } = await supabase
    .from('submittals')
    .select('id')
    .eq('id', subId)
    .eq('project_id', id)
    .single();

  if (subError) {
    if (subError.code === 'PGRST116') throw notFound('Submittal');
    throw serverError('Failed to verify submittal');
  }

  const log = await getDistributionLog(subId);
  return NextResponse.json({ data: log, total: log.length });
});

export const POST = withApiRoute(
  { bodySchema: distributionLogCreateSchema },
  async ({ params, body }) => {
    const { id, subId } = params;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { error: subError } = await supabase
      .from('submittals')
      .select('id')
      .eq('id', subId)
      .eq('project_id', id)
      .single();

    if (subError) {
      if (subError.code === 'PGRST116') throw notFound('Submittal');
      throw serverError('Failed to verify submittal');
    }

    const entries = await createDistributionLog(subId, body.recipients);
    return NextResponse.json({ data: entries, total: entries.length }, { status: 201 });
  },
);

import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { dailyLogUpdateSchema } from '@/lib/validators/projects';

export const PATCH = withApiRoute(
  { bodySchema: dailyLogUpdateSchema },
  async ({ params, body }) => {
    const { id, logId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('project_daily_logs')
      .update(body)
      .eq('id', logId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Log');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);

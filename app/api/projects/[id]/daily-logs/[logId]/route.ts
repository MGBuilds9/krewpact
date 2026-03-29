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

    // Offline sync: version conflict detection
    const { version: clientVersion, ...updateFields } = body;
    if (clientVersion !== undefined) {
      const { data: current } = await supabase
        .from('project_daily_logs')
        .select('version')
        .eq('id', logId)
        .eq('project_id', id)
        .single();
      if (current && current.version !== clientVersion) {
        return NextResponse.json(
          { error: 'Version conflict', server_version: current.version },
          { status: 409 },
        );
      }
    }

    const { data, error } = await supabase
      .from('project_daily_logs')
      .update(updateFields)
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

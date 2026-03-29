import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { timeEntryUpdateSchema } from '@/lib/validators/time-expense';

export const PATCH = withApiRoute(
  { bodySchema: timeEntryUpdateSchema },
  async ({ params, body }) => {
    const { id, entryId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Offline sync: version conflict detection
    const { version: clientVersion, ...updateFields } = body;
    if (clientVersion !== undefined) {
      const { data: current } = await supabase
        .from('time_entries')
        .select('version')
        .eq('id', entryId)
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
      .from('time_entries')
      .update({ ...updateFields, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data);
  },
);

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, entryId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', entryId)
    .eq('project_id', id);

  if (error) throw dbError(error.message);

  return new NextResponse(null, { status: 204 });
});

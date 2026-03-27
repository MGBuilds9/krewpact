import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { migrationBatchUpdateSchema } from '@/lib/validators/migration';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('migration_batches')
    .select(
      'id, source_system, batch_name, status, started_at, completed_at, summary, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: migrationBatchUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('migration_batches')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, source_system, batch_name, status, started_at, completed_at, summary, created_by, created_at, updated_at',
      )
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

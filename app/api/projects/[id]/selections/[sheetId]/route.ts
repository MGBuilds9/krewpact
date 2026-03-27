import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { selectionSheetUpdateSchema } from '@/lib/validators/selections';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id: projectId, sheetId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('selection_sheets')
    .select(
      'id, project_id, sheet_name, status, issued_at, locked_at, created_by, created_at, updated_at',
    )
    .eq('id', sheetId)
    .eq('project_id', projectId)
    .single();

  if (error) throw notFound('Selection sheet');
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: selectionSheetUpdateSchema },
  async ({ params, body }) => {
    const { id: projectId, sheetId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('selection_sheets')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', sheetId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);

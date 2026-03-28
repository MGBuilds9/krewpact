import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mergeSchema = z.object({
  primary_id: z.string().uuid(),
  secondary_id: z.string().uuid(),
});

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

function computeMergeUpdates(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown>,
): { updates: Record<string, unknown>; mergedFields: string[] } {
  const updates: Record<string, unknown> = {};
  const mergedFields: string[] = [];
  const skipFields = ['id', 'created_at', 'updated_at', 'deleted_at'];

  for (const [key, val] of Object.entries(secondary)) {
    if (skipFields.includes(key)) continue;
    const isEmpty = primary[key] === null || primary[key] === '' || primary[key] === undefined;
    if (isEmpty && val != null && val !== '') {
      updates[key] = val;
      mergedFields.push(key);
    }
  }
  return { updates, mergedFields };
}

async function reassignRelations(
  supabase: SupabaseClient,
  primaryId: string,
  secondaryId: string,
): Promise<string[]> {
  const reassigned: string[] = [];

  const [actErr, oppErr] = await Promise.all([
    supabase
      .from('activities')
      .update({ contact_id: primaryId })
      .eq('contact_id', secondaryId)
      .then((r) => r.error),
    supabase
      .from('opportunities')
      .update({ contact_id: primaryId })
      .eq('contact_id', secondaryId)
      .then((r) => r.error),
  ]);

  if (!actErr) reassigned.push('activities');
  if (!oppErr) reassigned.push('opportunities');
  return reassigned;
}

export const POST = withApiRoute({ bodySchema: mergeSchema }, async ({ body }) => {
  const { primary_id, secondary_id } = body as z.infer<typeof mergeSchema>;

  if (primary_id === secondary_id) {
    return NextResponse.json({ error: 'Cannot merge a contact with itself' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const [primaryResult, secondaryResult] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', primary_id).single(),
    supabase.from('contacts').select('*').eq('id', secondary_id).single(),
  ]);

  if (primaryResult.error)
    return NextResponse.json({ error: 'Primary contact not found' }, { status: 404 });
  if (secondaryResult.error)
    return NextResponse.json({ error: 'Secondary contact not found' }, { status: 404 });

  const { updates, mergedFields } = computeMergeUpdates(
    primaryResult.data as Record<string, unknown>,
    secondaryResult.data as Record<string, unknown>,
  );

  const reassigned = await reassignRelations(supabase, primary_id, secondary_id);

  if (Object.keys(updates).length > 0) {
    await supabase.from('contacts').update(updates).eq('id', primary_id);
  }
  await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', secondary_id);

  return NextResponse.json({
    primaryId: primary_id,
    secondaryId: secondary_id,
    mergedFields,
    reassignedRelations: reassigned,
  });
});

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { computeLeadMerge } from '@/lib/crm/duplicate-detector';
import { createUserClientSafe } from '@/lib/supabase/server';

const mergeSchema = z.object({
  primary_id: z.string().uuid(),
  secondary_id: z.string().uuid(),
});

const LEAD_FIELDS =
  'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at';

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function reassignLeadRelations(
  supabase: SupabaseClient,
  primaryId: string,
  secondaryId: string,
): Promise<string[]> {
  const [contactErr, activityErr, outreachErr, enrollmentErr] = await Promise.all([
    supabase
      .from('contacts')
      .update({ lead_id: primaryId })
      .eq('lead_id', secondaryId)
      .then((r) => r.error),
    supabase
      .from('activities')
      .update({ lead_id: primaryId })
      .eq('lead_id', secondaryId)
      .then((r) => r.error),
    supabase
      .from('outreach')
      .update({ lead_id: primaryId })
      .eq('lead_id', secondaryId)
      .then((r) => r.error),
    supabase
      .from('sequence_enrollments')
      .update({ lead_id: primaryId })
      .eq('lead_id', secondaryId)
      .then((r) => r.error),
  ]);

  const reassigned: string[] = [];
  if (!contactErr) reassigned.push('contacts');
  if (!activityErr) reassigned.push('activities');
  if (!outreachErr) reassigned.push('outreach');
  if (!enrollmentErr) reassigned.push('sequence_enrollments');
  return reassigned;
}

export const POST = withApiRoute({ bodySchema: mergeSchema }, async ({ body }) => {
  const { primary_id, secondary_id } = body as z.infer<typeof mergeSchema>;

  if (primary_id === secondary_id)
    return NextResponse.json({ error: 'Cannot merge a lead with itself' }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const [primaryResult, secondaryResult] = await Promise.all([
    supabase.from('leads').select(LEAD_FIELDS).eq('id', primary_id).single(),
    supabase.from('leads').select(LEAD_FIELDS).eq('id', secondary_id).single(),
  ]);

  if (primaryResult.error)
    return NextResponse.json(
      { error: `Primary lead not found: ${primaryResult.error.message}` },
      { status: 404 },
    );
  if (secondaryResult.error)
    return NextResponse.json(
      { error: `Secondary lead not found: ${secondaryResult.error.message}` },
      { status: 404 },
    );

  const { updates, mergedFields } = computeLeadMerge(
    primaryResult.data as Record<string, unknown>,
    secondaryResult.data as Record<string, unknown>,
  );
  const reassignedRelations = await reassignLeadRelations(supabase, primary_id, secondary_id);

  if (Object.keys(updates).length > 0)
    await supabase.from('leads').update(updates).eq('id', primary_id);
  await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', secondary_id);

  return NextResponse.json({
    primaryId: primary_id,
    secondaryId: secondary_id,
    mergedFields,
    reassignedRelations,
  });
});

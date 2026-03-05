import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { computeLeadMerge } from '@/lib/crm/duplicate-detector';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const mergeSchema = z.object({
  primary_id: z.string().uuid(),
  secondary_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { primary_id, secondary_id } = parsed.data;

  if (primary_id === secondary_id) {
    return NextResponse.json({ error: 'Cannot merge a lead with itself' }, { status: 400 });
  }

  const supabase = await createUserClient();

  // Fetch both leads
  const [primaryResult, secondaryResult] = await Promise.all([
    supabase.from('leads').select('id, company_name, status, lead_score, fit_score, intent_score, engagement_score, source_channel, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, project_type, project_description, estimated_value, estimated_sqft, timeline_urgency, decision_date, next_followup_at, last_touch_at, nurture_status, is_qualified, qualified_at, qualified_by, disqualified_reason, lost_reason, current_sequence_id, sequence_step, automation_paused, last_automation_at, external_id, domain, enrichment_status, enrichment_data, deleted_at, utm_campaign, utm_medium, utm_source, domain_hash').eq('id', primary_id).single(),
    supabase.from('leads').select('id, company_name, status, lead_score, fit_score, intent_score, engagement_score, source_channel, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, project_type, project_description, estimated_value, estimated_sqft, timeline_urgency, decision_date, next_followup_at, last_touch_at, nurture_status, is_qualified, qualified_at, qualified_by, disqualified_reason, lost_reason, current_sequence_id, sequence_step, automation_paused, last_automation_at, external_id, domain, enrichment_status, enrichment_data, deleted_at, utm_campaign, utm_medium, utm_source, domain_hash').eq('id', secondary_id).single(),
  ]);

  if (primaryResult.error) {
    return NextResponse.json(
      { error: `Primary lead not found: ${primaryResult.error.message}` },
      { status: 404 },
    );
  }

  if (secondaryResult.error) {
    return NextResponse.json(
      { error: `Secondary lead not found: ${secondaryResult.error.message}` },
      { status: 404 },
    );
  }

  const primary = primaryResult.data;
  const secondary = secondaryResult.data;

  // Compute merge
  const { updates, mergedFields } = computeLeadMerge(
    primary as Record<string, unknown>,
    secondary as Record<string, unknown>,
  );

  // Reassign contacts from secondary to primary
  const { error: contactError } = await supabase
    .from('contacts')
    .update({ lead_id: primary_id })
    .eq('lead_id', secondary_id);

  // Reassign activities from secondary to primary
  const { error: activityError } = await supabase
    .from('activities')
    .update({ lead_id: primary_id })
    .eq('lead_id', secondary_id);

  // Reassign outreach from secondary to primary
  const { error: outreachError } = await supabase
    .from('outreach')
    .update({ lead_id: primary_id })
    .eq('lead_id', secondary_id);

  // Reassign sequence enrollments from secondary to primary
  const { error: enrollmentError } = await supabase
    .from('sequence_enrollments')
    .update({ lead_id: primary_id })
    .eq('lead_id', secondary_id);

  const reassignedRelations: string[] = [];
  if (!contactError) reassignedRelations.push('contacts');
  if (!activityError) reassignedRelations.push('activities');
  if (!outreachError) reassignedRelations.push('outreach');
  if (!enrollmentError) reassignedRelations.push('sequence_enrollments');

  // Update primary with merged fields
  if (Object.keys(updates).length > 0) {
    await supabase.from('leads').update(updates).eq('id', primary_id);
  }

  // Soft-delete secondary
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
}

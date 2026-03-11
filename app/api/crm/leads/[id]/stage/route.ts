import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { leadStageTransitionSchema } from '@/lib/validators/crm';
import { validateTransition, type LeadStage } from '@/lib/crm/lead-stages';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
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

  // Validate the stage transition payload (Zod checks enum + lost_reason)
  const parsed = leadStageTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch current lead to get current stage
  const { data: currentLead, error: fetchError } = await supabase
    .from('leads')
    .select(
      'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  // Validate the transition
  const currentStage = currentLead.status as LeadStage;
  const newStage = parsed.data.stage;
  const result = validateTransition(currentStage, newStage);

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Build update payload
  const updateData: Record<string, unknown> = { status: newStage };
  if (parsed.data.lost_reason) {
    updateData.lost_reason = parsed.data.lost_reason;
  }

  // Update the lead
  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record stage transition in history (non-blocking)
  try {
    await supabase.from('lead_stage_history').insert({
      lead_id: id,
      from_stage: currentStage,
      to_stage: newStage,
      notes: parsed.data.lost_reason ?? null,
    });
  } catch {
    // History write failure should not block the stage transition
    logger.error('Failed to record lead stage history', { leadId: id });
  }

  return NextResponse.json(updated);
}

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { opportunityStageTransitionSchema } from '@/lib/validators/crm';
import { validateTransition, type OpportunityStage } from '@/lib/crm/opportunity-stages';
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
  const parsed = opportunityStageTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch current opportunity to get current stage
  const { data: currentOpportunity, error: fetchError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  // Validate the transition
  const currentStage = currentOpportunity.stage as OpportunityStage;
  const newStage = parsed.data.stage;
  const result = validateTransition(currentStage, newStage);

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Build update payload
  const updateData: Record<string, unknown> = { stage: newStage };
  if (parsed.data.lost_reason) {
    updateData.lost_reason = parsed.data.lost_reason;
  }

  // Update the opportunity
  const { data: updated, error: updateError } = await supabase
    .from('opportunities')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record stage transition in history (non-blocking)
  try {
    await supabase.from('opportunity_stage_history').insert({
      opportunity_id: id,
      from_stage: currentStage,
      to_stage: newStage,
    });
  } catch {
    logger.error('Failed to record opportunity stage history', { opportunityId: id });
  }

  return NextResponse.json(updated);
}

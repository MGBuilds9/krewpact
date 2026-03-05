import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { lostDealSchema } from '@/lib/validators/crm';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

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

  const parsed = lostDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch opportunity and verify it's not already closed_lost
  const { data: opportunity, error: fetchError } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  const oppData = opportunity as Record<string, unknown>;
  if (oppData.stage === 'closed_lost') {
    return NextResponse.json(
      { error: 'Opportunity is already in closed_lost stage' },
      { status: 400 },
    );
  }

  const previousStage = oppData.stage as string;

  // Update opportunity to closed_lost with metadata
  const updatePayload: Record<string, unknown> = {
    stage: 'closed_lost',
    lost_reason: parsed.data.lost_reason,
  };
  if (parsed.data.lost_notes !== undefined) {
    updatePayload.lost_notes = parsed.data.lost_notes;
  }
  if (parsed.data.competitor !== undefined) {
    updatePayload.competitor = parsed.data.competitor;
  }

  const { data: updated, error: updateError } = await supabase
    .from('opportunities')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record stage history
  await supabase.from('opportunity_stage_history').insert({
    opportunity_id: id,
    from_stage: previousStage,
    to_stage: 'closed_lost',
    changed_by: userId,
  });

  // Create activity record for the loss
  await supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Lost',
    details: `Lost reason: ${parsed.data.lost_reason}${parsed.data.competitor ? `. Competitor: ${parsed.data.competitor}` : ''}${parsed.data.lost_notes ? `. ${parsed.data.lost_notes}` : ''}`,
    opportunity_id: id,
    owner_user_id: userId,
  });

  // If reopen_as_lead, create a new lead from the opportunity
  let newLead = null;
  if (parsed.data.reopen_as_lead) {
    const { data: leadData } = await supabase
      .from('leads')
      .insert({
        lead_name: `${oppData.opportunity_name} (Re-nurture)`,
        division_id: oppData.division_id,
        source: 'lost_opportunity',
        company_name: null,
        email: null,
        phone: null,
        estimated_value: oppData.estimated_revenue,
        probability_pct: 10,
        stage: 'new',
        assigned_to: oppData.owner_user_id,
      })
      .select()
      .single();
    newLead = leadData;
  }

  return NextResponse.json({
    ...updated,
    new_lead: newLead,
  });
}

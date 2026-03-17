import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactUserId } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';
import { lostDealSchema } from '@/lib/validators/crm';

type RouteContext = { params: Promise<{ id: string }> };
type UserClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

function buildUpdatePayload(data: {
  lost_reason: string;
  lost_notes?: string;
  competitor?: string;
}) {
  const payload: Record<string, unknown> = { stage: 'closed_lost', lost_reason: data.lost_reason };
  if (data.lost_notes !== undefined) payload.lost_notes = data.lost_notes;
  if (data.competitor !== undefined) payload.competitor = data.competitor;
  return payload;
}

function buildActivityDetails(data: {
  lost_reason: string;
  competitor?: string;
  lost_notes?: string;
}) {
  const parts = [`Lost reason: ${data.lost_reason}`];
  if (data.competitor) parts.push(`Competitor: ${data.competitor}`);
  if (data.lost_notes) parts.push(data.lost_notes);
  return parts.join('. ');
}

async function maybeReopenAsLead(
  supabase: UserClient,
  oppData: Record<string, unknown>,
  reopen: boolean,
) {
  if (!reopen) return null;
  const { data: leadData } = await supabase
    .from('leads')
    .insert({
      first_name: `${oppData.opportunity_name} (Re-nurture)`,
      source_channel: 'lost_opportunity',
      company_name: null,
      email: null,
      phone: null,
      status: 'new',
      assigned_to: oppData.owner_user_id,
    })
    .select()
    .single();
  return leadData;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = lostDealSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: opportunity, error: fetchError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json(
      { error: fetchError.message },
      { status: fetchError.code === 'PGRST116' ? 404 : 500 },
    );
  }

  const oppData = opportunity as Record<string, unknown>;
  if (oppData.stage === 'closed_lost') {
    return NextResponse.json(
      { error: 'Opportunity is already in closed_lost stage' },
      { status: 400 },
    );
  }

  const previousStage = oppData.stage as string;
  const { data: updated, error: updateError } = await supabase
    .from('opportunities')
    .update(buildUpdatePayload(parsed.data))
    .eq('id', id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await supabase.from('opportunity_stage_history').insert({
    opportunity_id: id,
    from_stage: previousStage,
    to_stage: 'closed_lost',
    changed_by: krewpactUserId,
  });

  await supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Lost',
    details: buildActivityDetails(parsed.data),
    opportunity_id: id,
    owner_user_id: krewpactUserId,
  });

  const newLead = await maybeReopenAsLead(supabase, oppData, parsed.data.reopen_as_lead ?? false);
  return NextResponse.json({ ...updated, new_lead: newLead });
}

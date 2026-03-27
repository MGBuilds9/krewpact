import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { lostDealSchema } from '@/lib/validators/crm';

type UserClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

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

export const POST = withApiRoute({ bodySchema: lostDealSchema }, async ({ params, body }) => {
  const { id } = params;
  const parsed = body as z.infer<typeof lostDealSchema>;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) throw forbidden('Unauthorized');

  const { data: opportunity, error: fetchError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') throw notFound('Opportunity');
    throw dbError(fetchError.message);
  }

  const oppData = opportunity as Record<string, unknown>;
  if (oppData.stage === 'closed_lost') {
    return NextResponse.json(
      { error: { code: 'ALREADY_LOST', message: 'Opportunity is already in closed_lost stage' } },
      { status: 400 },
    );
  }

  const previousStage = oppData.stage as string;
  const { data: updated, error: updateError } = await supabase
    .from('opportunities')
    .update(buildUpdatePayload(parsed))
    .eq('id', id)
    .select()
    .single();
  if (updateError) throw dbError(updateError.message);

  await supabase.from('opportunity_stage_history').insert({
    opportunity_id: id,
    from_stage: previousStage,
    to_stage: 'closed_lost',
    changed_by: krewpactUserId,
  });

  await supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Lost',
    details: buildActivityDetails(parsed),
    opportunity_id: id,
    owner_user_id: krewpactUserId,
  });

  const newLead = await maybeReopenAsLead(supabase, oppData, parsed.reopen_as_lead ?? false);
  return NextResponse.json({ ...updated, new_lead: newLead });
});

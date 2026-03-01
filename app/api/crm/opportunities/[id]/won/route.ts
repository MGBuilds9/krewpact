import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { wonDealSchema } from '@/lib/validators/crm';
import { SyncService } from '@/lib/erp/sync-service';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = wonDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch opportunity and verify it's in 'contracted' stage
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
  if (oppData.stage !== 'contracted') {
    return NextResponse.json(
      { error: `Only opportunities in 'contracted' stage can be marked as won. Current stage: '${oppData.stage}'` },
      { status: 400 },
    );
  }

  // Update opportunity with won metadata
  const wonDate = parsed.data.won_date || new Date().toISOString().split('T')[0];
  const updatePayload: Record<string, unknown> = {
    won_at: wonDate,
  };
  if (parsed.data.won_notes !== undefined) {
    updatePayload.won_notes = parsed.data.won_notes;
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

  // Sync to ERPNext if requested
  let syncResult = null;
  if (parsed.data.sync_to_erp) {
    try {
      const syncService = new SyncService();
      syncResult = await syncService.syncWonDeal(id, userId, wonDate);
    } catch {
      // Sync failure doesn't fail the won action
    }
  }

  // Create activity record for the win
  await supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Won',
    details: parsed.data.won_notes || `Opportunity marked as won on ${wonDate}`,
    opportunity_id: id,
    owner_user_id: userId,
  });

  return NextResponse.json({
    ...updated,
    sync_result: syncResult,
  });
}

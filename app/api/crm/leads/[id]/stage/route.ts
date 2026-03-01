import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { leadStageTransitionSchema } from '@/lib/validators/crm';
import { validateTransition, type LeadStage } from '@/lib/crm/lead-stages';
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

  // Validate the stage transition payload (Zod checks enum + lost_reason)
  const parsed = leadStageTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch current lead to get current stage
  const { data: currentLead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  // Validate the transition
  const currentStage = (currentLead.status ?? currentLead.stage) as LeadStage;
  const newStage = parsed.data.stage;
  const result = validateTransition(currentStage, newStage);

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Build update payload
  const updateData: Record<string, unknown> = { status: newStage };
  if (parsed.data.lost_reason) {
    updateData.substatus = parsed.data.lost_reason;
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
    console.error('Failed to record lead stage history');
  }

  return NextResponse.json(updated);
}

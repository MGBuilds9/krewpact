import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { opportunityUpdateSchema } from '@/lib/validators/crm';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at, opportunity_stage_history(*)')
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = opportunityUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();

  // If stage is being changed, record history
  if (parsed.data.stage) {
    // Fetch current opportunity to detect stage change
    const { data: current, error: fetchError } = await supabase
      .from('opportunities')
      .select('stage')
      .eq('id', id)
      .single();

    if (fetchError) {
      const status = fetchError.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    const currentStage = (current as Record<string, unknown>)?.stage as string;

    if (currentStage && currentStage !== parsed.data.stage) {
      // Insert stage history record
      await supabase.from('opportunity_stage_history').insert({
        opportunity_id: id,
        from_stage: currentStage,
        to_stage: parsed.data.stage,
        changed_by: userId,
      });
    }
  }

  // Update the opportunity
  const { data, error } = await supabase
    .from('opportunities')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { error } = await supabase.from('opportunities').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

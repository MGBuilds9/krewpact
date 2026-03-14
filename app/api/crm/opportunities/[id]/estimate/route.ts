import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { linkedEstimateCreateSchema } from '@/lib/validators/crm';
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
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Verify opportunity exists
  const { error: oppError } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', id)
    .single();

  if (oppError) {
    const status = oppError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: oppError.message }, { status });
  }

  // Fetch linked estimates
  const { data, error } = await supabase
    .from('estimates')
    .select('id, estimate_number, total_amount, status')
    .eq('opportunity_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

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

  const parsed = linkedEstimateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Verify opportunity exists
  const { data: opportunity, error: oppError } = await supabase
    .from('opportunities')
    .select('id, division_id')
    .eq('id', id)
    .single();

  if (oppError) {
    const status = oppError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: oppError.message }, { status });
  }

  const oppData = opportunity as Record<string, unknown>;

  // Create estimate linked to this opportunity
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      ...parsed.data,
      opportunity_id: id,
      division_id: oppData.division_id as string | null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

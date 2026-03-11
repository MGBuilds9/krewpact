import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

const scoringRuleUpdateSchema = z.object({
  rule_name: z.string().min(1).max(200).optional(),
  category: z.enum(['fit', 'intent', 'engagement']).optional(),
  field_name: z.string().min(1).optional(),
  operator: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  points: z.number().int().optional(),
  active: z.boolean().optional(),
  description: z.string().optional(),
});

export async function PUT(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = scoringRuleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase
    .from('scoring_rules')
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

export async function DELETE(_req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { error } = await supabase.from('scoring_rules').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

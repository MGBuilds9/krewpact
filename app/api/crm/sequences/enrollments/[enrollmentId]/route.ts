import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ enrollmentId: string }> };

const patchSchema = z.object({
  action: z.enum(['pause', 'resume']),
});

export async function PATCH(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { enrollmentId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { action } = parsed.data;

  if (action === 'pause') {
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .update({ status: 'paused', paused_at: new Date().toISOString() })
      .eq('id', enrollmentId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Enrollment not found or not active' }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  // Resume
  const { data, error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'active', paused_at: null })
    .eq('id', enrollmentId)
    .eq('status', 'paused')
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Enrollment not found or not paused' }, { status: 404 });
  }
  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { z } from 'zod';

const prefsSchema = z.object({
  insight_min_confidence: z.number().min(0).max(1).optional(),
  digest_enabled: z.boolean().optional(),
  ai_suggestions_enabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client, error } = await createUserClientSafe();
  if (error || !client) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data: user } = await client
    .from('users')
    .select('ai_preferences')
    .eq('clerk_id', userId)
    .single();

  const defaults = {
    insight_min_confidence: 0.7,
    digest_enabled: true,
    ai_suggestions_enabled: true,
  };

  return NextResponse.json({
    preferences: { ...defaults, ...((user as { ai_preferences?: Record<string, unknown> } | null)?.ai_preferences ?? {}) },
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 10, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const body = await req.json();
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client, error } = await createUserClientSafe();
  if (error || !client) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data: existing } = await client
    .from('users')
    .select('ai_preferences')
    .eq('clerk_id', userId)
    .single();

  const merged = {
    ...((existing as { ai_preferences?: Record<string, unknown> } | null)?.ai_preferences ?? {}),
    ...parsed.data,
  };

  const { error: updateError } = await client
    .from('users')
    .update({ ai_preferences: merged } as Record<string, unknown>)
    .eq('clerk_id', userId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }

  return NextResponse.json({ success: true, preferences: merged });
}

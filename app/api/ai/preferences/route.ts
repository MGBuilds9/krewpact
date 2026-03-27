import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const prefsSchema = z.object({
  insight_min_confidence: z.number().min(0).max(1).optional(),
  digest_enabled: z.boolean().optional(),
  ai_suggestions_enabled: z.boolean().optional(),
});

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async ({ userId }) => {
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
    preferences: {
      ...defaults,
      ...((user as { ai_preferences?: Record<string, unknown> } | null)?.ai_preferences ?? {}),
    },
  });
});

export const PATCH = withApiRoute(
  { rateLimit: { limit: 10, window: '1 m' }, bodySchema: prefsSchema },
  async ({ body, userId }) => {
    const { client, error } = await createUserClientSafe();
    if (error || !client) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { data: existing } = await client
      .from('users')
      .select('ai_preferences')
      .eq('clerk_id', userId)
      .single();

    const merged = {
      ...((existing as { ai_preferences?: Record<string, unknown> } | null)?.ai_preferences ?? {}),
      ...body,
    };

    const { error: updateError } = await client
      .from('users')
      .update({ ai_preferences: merged } as Record<string, unknown>)
      .eq('clerk_id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: merged });
  },
);

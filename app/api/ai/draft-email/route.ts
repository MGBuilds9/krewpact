import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { z } from 'zod';
import { draftEmail } from '@/lib/ai/agents/email-drafter';
import { logger } from '@/lib/logger';

const draftSchema = z.object({
  entity_type: z.enum(['lead', 'opportunity', 'account']),
  entity_id: z.string().uuid(),
  draft_type: z.enum(['follow_up', 'introduction', 'proposal', 'custom']).default('follow_up'),
  custom_instructions: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  if (process.env.AI_ENABLED !== 'true') {
    return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Get org_id from user's Supabase client
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: user } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', userId)
    .single();

  const orgId = user?.org_id ?? 'unknown';

  try {
    const draft = await draftEmail({
      entityType: parsed.data.entity_type,
      entityId: parsed.data.entity_id,
      orgId,
      userId,
      draftType: parsed.data.draft_type,
      customInstructions: parsed.data.custom_instructions,
    });

    return NextResponse.json(draft);
  } catch (err) {
    logger.error('Email draft generation failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to generate email draft' }, { status: 500 });
  }
}

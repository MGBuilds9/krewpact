import { NextResponse } from 'next/server';
import { z } from 'zod';

import { draftEmail } from '@/lib/ai/agents/email-drafter';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const draftSchema = z.object({
  entity_type: z.enum(['lead', 'opportunity', 'account']),
  entity_id: z.string().uuid(),
  draft_type: z.enum(['follow_up', 'introduction', 'proposal', 'custom']).default('follow_up'),
  custom_instructions: z.string().max(500).optional(),
});

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' }, bodySchema: draftSchema },
  async ({ body, userId, logger }) => {
    if (process.env.AI_ENABLED !== 'true') {
      return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 });
    }

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { data: user } = await supabase.from('users').select('org_id').eq('id', userId).single();
    const orgId = user?.org_id ?? 'unknown';

    try {
      const draft = await draftEmail({
        entityType: body.entity_type,
        entityId: body.entity_id,
        orgId,
        userId,
        draftType: body.draft_type,
        customInstructions: body.custom_instructions,
      });

      return NextResponse.json(draft);
    } catch (err) {
      logger.error('Email draft generation failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: 'Failed to generate email draft' }, { status: 500 });
    }
  },
);

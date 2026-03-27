import { NextResponse } from 'next/server';
import { z } from 'zod';

import { executeNLQuery } from '@/lib/ai/agents/nl-query';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const queryBodySchema = z.object({
  query: z.string().min(3).max(500),
});

export const POST = withApiRoute(
  { rateLimit: { limit: 20, window: '1 m' }, bodySchema: queryBodySchema },
  async ({ body, userId, logger }) => {
    if (process.env.AI_ENABLED !== 'true') {
      return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 });
    }

    const { client, error: clientError } = await createUserClientSafe();
    if (clientError || !client) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    const { data: user } = await client
      .from('users')
      .select('org_id')
      .eq('clerk_id', userId)
      .single();
    if (!user?.org_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    try {
      const result = await executeNLQuery({
        query: body.query,
        orgId: user.org_id,
        userId,
      });

      return NextResponse.json({ success: true, ...result });
    } catch (err) {
      logger.error('NL query failed', { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
  },
);

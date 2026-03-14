import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createUserClientSafe } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { executeNLQuery } from '@/lib/ai/agents/nl-query';

const querySchema = z.object({
  query: z.string().min(3).max(500),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.AI_ENABLED !== 'true') {
    return NextResponse.json({ error: 'AI features are not enabled' }, { status: 503 });
  }

  const limited = await rateLimit(req, { limit: 20, window: '1 m', identifier: 'ai-query' });
  if (!limited.success) return rateLimitResponse(limited);

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { client, error: clientError } = await createUserClientSafe();
  if (clientError || !client) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }

  // Get org_id from user
  const { data: user } = await client.from('users').select('org_id').eq('clerk_id', userId).single();
  if (!user?.org_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  try {
    const result = await executeNLQuery({
      query: parsed.data.query,
      orgId: user.org_id,
      userId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    logger.error('NL query failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { errorResponse, INVALID_JSON, UNAUTHORIZED, validationError } from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { returnSerial } from '@/lib/inventory/serials';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

const returnSchema = z.object({
  return_location_id: z.string().uuid(),
  return_spot_id: z.string().uuid().optional(),
  condition_notes: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(INVALID_JSON);
  }

  const parsed = returnSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const result = await returnSerial(supabase, id, {
      ...parsed.data,
      transacted_by: userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to return serial';
    logger.error('Failed to return serial', { error: err, id });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

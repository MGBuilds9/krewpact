import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import {
  dbError,
  errorResponse,
  INVALID_JSON,
  UNAUTHORIZED,
  validationError,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createSerial, listSerials } from '@/lib/inventory/serials';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createSerialSchema } from '@/lib/validators/inventory';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return errorResponse(UNAUTHORIZED);

  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const sp = req.nextUrl.searchParams;

  try {
    const result = await listSerials(supabase, {
      divisionId: sp.get('division_id') ?? undefined,
      itemId: sp.get('item_id') ?? undefined,
      status: sp.get('status') ?? undefined,
      locationId: sp.get('location_id') ?? undefined,
      checkedOutTo: sp.get('checked_out_to') ?? undefined,
      search: sp.get('search') ?? undefined,
      limit: sp.has('limit') ? Number(sp.get('limit')) : undefined,
      offset: sp.has('offset') ? Number(sp.get('offset')) : undefined,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error('Failed to list serials', { error: err });
    return errorResponse(dbError('Failed to list serials'));
  }
}

export async function POST(req: NextRequest) {
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

  const parsed = createSerialSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const serial = await createSerial(supabase, parsed.data);
    return NextResponse.json(serial, { status: 201 });
  } catch (err: unknown) {
    logger.error('Failed to create serial', { error: err });
    return errorResponse(dbError('Failed to create serial'));
  }
}

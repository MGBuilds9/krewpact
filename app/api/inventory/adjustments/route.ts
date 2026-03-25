import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  dbError,
  errorResponse,
  INVALID_JSON,
  UNAUTHORIZED,
  validationError,
} from '@/lib/api/errors';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createLedgerEntry } from '@/lib/inventory/ledger';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const adjustmentBodySchema = z.object({
  item_id: z.string().uuid(),
  location_id: z.string().uuid(),
  division_id: z.string().uuid(),
  qty_change: z.number().refine((v) => v !== 0, { message: 'qty_change must not be zero' }),
  reason_code: z.string().min(1),
  notes: z.string().optional(),
  valuation_rate: z.number().min(0).optional(),
});

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

  const parsed = adjustmentBodySchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    const entry = await createLedgerEntry(supabase, {
      item_id: parsed.data.item_id,
      location_id: parsed.data.location_id,
      division_id: parsed.data.division_id,
      transaction_type: 'stock_adjustment',
      qty_change: parsed.data.qty_change,
      valuation_rate: parsed.data.valuation_rate ?? 0,
      reason_code: parsed.data.reason_code,
      notes: parsed.data.notes ?? null,
      transacted_by: userId,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    logger.error('Failed to create stock adjustment', { error: err });
    return errorResponse(dbError('Failed to create stock adjustment'));
  }
}

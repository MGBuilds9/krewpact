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
import { createLedgerEntry, createTransferEntries } from '@/lib/inventory/ledger';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createTransactionSchema } from '@/lib/validators/inventory';

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

  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(validationError(parsed.error.flatten()));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  try {
    if (parsed.data.transaction_type === 'stock_transfer') {
      const entries = await createTransferEntries(supabase, {
        item_id: parsed.data.item_id,
        division_id: parsed.data.division_id,
        qty: Math.abs(parsed.data.qty_change),
        valuation_rate: parsed.data.valuation_rate ?? 0,
        from_location_id: parsed.data.location_id,
        to_location_id: parsed.data.counterpart_location_id!,
        from_spot_id: parsed.data.spot_id,
        to_spot_id: undefined,
        serial_id: parsed.data.serial_id,
        lot_number: parsed.data.lot_number,
        notes: parsed.data.notes,
        transacted_by: userId,
      });

      return NextResponse.json(entries, { status: 201 });
    }

    const entry = await createLedgerEntry(supabase, {
      ...parsed.data,
      transacted_by: userId,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    logger.error('Failed to create transaction', { error: err });
    return errorResponse(dbError('Failed to create transaction'));
  }
}

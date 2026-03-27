import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { createLedgerEntry } from '@/lib/inventory/ledger';
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

export const POST = withApiRoute({ bodySchema: adjustmentBodySchema }, async ({ body, userId }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const entry = await createLedgerEntry(supabase, {
    item_id: body.item_id,
    location_id: body.location_id,
    division_id: body.division_id,
    transaction_type: 'stock_adjustment',
    qty_change: body.qty_change,
    valuation_rate: body.valuation_rate ?? 0,
    reason_code: body.reason_code,
    notes: body.notes ?? null,
    transacted_by: userId,
  }).catch(() => {
    throw dbError('Failed to create stock adjustment');
  });

  return NextResponse.json(entry, { status: 201 });
});

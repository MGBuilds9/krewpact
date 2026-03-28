import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createLedgerEntry, createTransferEntries } from '@/lib/inventory/ledger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { createTransactionSchema } from '@/lib/validators/inventory';

export const POST = withApiRoute(
  { bodySchema: createTransactionSchema },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    if (body.transaction_type === 'stock_transfer') {
      const entries = await createTransferEntries(supabase, {
        item_id: body.item_id,
        division_id: body.division_id,
        qty: Math.abs(body.qty_change),
        valuation_rate: body.valuation_rate ?? 0,
        from_location_id: body.location_id,
        to_location_id: body.counterpart_location_id!,
        from_spot_id: body.spot_id,
        to_spot_id: undefined,
        serial_id: body.serial_id,
        lot_number: body.lot_number,
        notes: body.notes,
        transacted_by: userId,
      }).catch(() => {
        throw dbError('Failed to create transaction');
      });

      return NextResponse.json(entries, { status: 201 });
    }

    const entry = await createLedgerEntry(supabase, {
      ...body,
      transacted_by: userId,
    }).catch(() => {
      throw dbError('Failed to create transaction');
    });

    return NextResponse.json(entry, { status: 201 });
  },
);

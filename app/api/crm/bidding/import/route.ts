import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { biddingImportSchema } from '@/lib/validators/crm';

export const POST = withApiRoute(
  { bodySchema: biddingImportSchema, rateLimit: { limit: 10, window: '1 m' } },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const rows = body.items.map((item) => ({
      ...item,
      source: item.source ?? 'merx',
      created_by: userId,
    }));

    const { data, error } = await supabase.from('bidding_opportunities').insert(rows).select();

    if (error) throw dbError(error.message);

    return NextResponse.json({ imported: data?.length ?? 0, items: data }, { status: 201 });
  },
);

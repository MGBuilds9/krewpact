import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, receiptId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('expense_receipts')
    .delete()
    .eq('id', receiptId)
    .eq('expense_id', id);

  if (error) throw dbError(error.message);
  return new NextResponse(null, { status: 204 });
});

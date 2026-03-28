import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { deactivateItem, getItem, updateItem } from '@/lib/inventory/items';
import { createUserClientSafe } from '@/lib/supabase/server';
import { updateItemSchema } from '@/lib/validators/inventory';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const item = await getItem(supabase, id).catch(() => {
    throw dbError('Failed to get inventory item');
  });

  if (!item) throw notFound('Inventory item');

  return NextResponse.json(item);
});

export const PATCH = withApiRoute({ bodySchema: updateItemSchema }, async ({ body, params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const item = await updateItem(supabase, id, body).catch(() => {
    throw dbError('Failed to update inventory item');
  });

  return NextResponse.json(item);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const item = await deactivateItem(supabase, id).catch(() => {
    throw dbError('Failed to deactivate inventory item');
  });

  return NextResponse.json(item);
});

import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getStockByProject } from '@/lib/inventory/stock-summary';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  if (!isFeatureEnabled('inventory_management')) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const { projectId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await getStockByProject(supabase, projectId).catch(() => {
    throw dbError('Failed to get stock by project');
  });

  return NextResponse.json(result);
});

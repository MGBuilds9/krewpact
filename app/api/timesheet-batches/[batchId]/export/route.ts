import { NextResponse } from 'next/server';

import { serverError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { exportToADP } from '@/lib/services/payroll';
import { createUserClientSafe } from '@/lib/supabase/server';

const ALLOWED_ROLES = new Set([
  'platform_admin',
  'executive',
  'accounting',
  'payroll_admin',
  'operations_manager',
]);

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async ({ params }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((r: string) => ALLOWED_ROLES.has(r)))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { batchId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let csv: string;
  try {
    csv = await exportToADP(supabase, batchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    throw serverError(message);
  }

  const filename = `adp-export-${batchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { exportToADP } from '@/lib/services/payroll';
import { createUserClientSafe } from '@/lib/supabase/server';

const ALLOWED_ROLES = new Set([
  'platform_admin',
  'executive',
  'accounting',
  'payroll_admin',
  'operations_manager',
]);

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  const hasRole = roles.some((r) => ALLOWED_ROLES.has(r));
  if (!hasRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { batchId } = await context.params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let csv: string;
  try {
    csv = await exportToADP(supabase, batchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const filename = `adp-export-${batchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireRole } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { getHoldbackSchedule } from '@/lib/services/financial-ops';

const FINANCE_ROLES = ['platform_admin', 'executive', 'accounting', 'operations_manager'];

const querySchema = z.object({
  project_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const authResult = await requireRole(FINANCE_ROLES);
  if (authResult instanceof NextResponse) return authResult;

  const { project_id } = query as { project_id: string };
  const schedule = await getHoldbackSchedule(project_id);
  return NextResponse.json(schedule);
});

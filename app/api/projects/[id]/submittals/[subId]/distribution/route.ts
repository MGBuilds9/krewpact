import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createDistributionLog, getDistributionLog } from '@/lib/services/document-control';
import { createUserClientSafe } from '@/lib/supabase/server';
import { distributionLogCreateSchema } from '@/lib/validators/document-control';

type RouteContext = { params: Promise<{ id: string; subId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, subId } = await context.params;

  // Verify submittal belongs to project (RLS enforced)
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: subError } = await supabase
    .from('submittals')
    .select('id')
    .eq('id', subId)
    .eq('project_id', id)
    .single();

  if (subError) {
    const status = subError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: 'Submittal not found' }, { status });
  }

  try {
    const log = await getDistributionLog(subId);
    return NextResponse.json({ data: log, total: log.length });
  } catch (err: unknown) {
    logger.error('[submittal-distribution] GET failed', { message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to get distribution log' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 20, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, subId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = distributionLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify submittal belongs to project
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error: subError } = await supabase
    .from('submittals')
    .select('id')
    .eq('id', subId)
    .eq('project_id', id)
    .single();

  if (subError) {
    const status = subError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: 'Submittal not found' }, { status });
  }

  try {
    const entries = await createDistributionLog(subId, parsed.data.recipients);
    return NextResponse.json({ data: entries, total: entries.length }, { status: 201 });
  } catch (err: unknown) {
    logger.error('[submittal-distribution] POST failed', { message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to create distribution log' }, { status: 500 });
  }
}

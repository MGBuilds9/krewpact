import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { SyncService } from '@/lib/erp/sync-service';

const syncRequestSchema = z.object({
  entity_type: z.enum(['account', 'estimate']),
  entity_id: z.string().uuid(),
});

/**
 * POST /api/erp/sync — Trigger an ERP sync for a given entity.
 * Returns the sync job result (status, erp_docname, etc.)
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { entity_type, entity_id } = parsed.data;
  const service = new SyncService();

  let result;
  if (entity_type === 'account') {
    result = await service.syncAccount(entity_id, userId);
  } else {
    result = await service.syncEstimate(entity_id, userId);
  }

  return NextResponse.json(result);
}

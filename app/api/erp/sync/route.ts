import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { ErpClient } from '@/lib/erp/client';
import { SyncService } from '@/lib/erp/sync-service';
import { logger } from '@/lib/logger';

const ENTITY_TYPES = [
  'account',
  'contact',
  'opportunity',
  'estimate',
  'contract',
  'project',
  'task',
  'supplier',
  'expense',
  'timesheet',
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

const syncRequestSchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().uuid(),
});

function getEntitySyncer(
  service: SyncService,
  entityType: EntityType,
  entityId: string,
  userId: string,
) {
  const syncMap: Record<EntityType, () => Promise<unknown>> = {
    account: () => service.syncAccount(entityId, userId),
    contact: () => service.syncContact(entityId, userId),
    opportunity: () => service.syncOpportunity(entityId, userId),
    estimate: () => service.syncEstimate(entityId, userId),
    contract: () => service.syncWonDeal(entityId, userId, new Date().toISOString().slice(0, 10)),
    project: () => service.syncProject(entityId, userId),
    task: () => service.syncTask(entityId, userId),
    supplier: () => service.syncSupplier(entityId, userId),
    expense: () => service.syncExpenseClaim(entityId, userId),
    timesheet: () => service.syncTimesheet(entityId, userId),
  };
  return syncMap[entityType];
}

/**
 * POST /api/erp/sync — Trigger an ERP sync for a given entity.
 * Supports all 10 outbound entity types (12 MVP mappings including read-only invoices).
 * Returns the sync job result (status, erp_docname, etc.)
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(request, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

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

  const erpClient = new ErpClient();
  if (erpClient.isMockMode()) {
    return NextResponse.json({
      warning: 'ERPNext mock mode — no data synced',
      entity_type,
      entity_id,
    });
  }

  const service = new SyncService();

  try {
    const syncer = getEntitySyncer(service, entity_type, entity_id, userId);
    const result = await syncer();
    return NextResponse.json(result);
  } catch (err) {
    logger.error('ERP sync failed:', err as Record<string, unknown>);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

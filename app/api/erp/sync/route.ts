import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { SyncService } from '@/lib/erp/sync-service';
import { ErpClient } from '@/lib/erp/client';
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

const syncRequestSchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().uuid(),
});

/**
 * POST /api/erp/sync — Trigger an ERP sync for a given entity.
 * Supports all 10 outbound entity types (12 MVP mappings including read-only invoices).
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
    let result;
    switch (entity_type) {
      case 'account':
        result = await service.syncAccount(entity_id, userId);
        break;
      case 'contact':
        result = await service.syncContact(entity_id, userId);
        break;
      case 'opportunity':
        result = await service.syncOpportunity(entity_id, userId);
        break;
      case 'estimate':
        result = await service.syncEstimate(entity_id, userId);
        break;
      case 'contract':
        // Contract maps to Sales Order via won deal flow
        result = await service.syncWonDeal(entity_id, userId, new Date().toISOString().slice(0, 10));
        break;
      case 'project':
        result = await service.syncProject(entity_id, userId);
        break;
      case 'task':
        result = await service.syncTask(entity_id, userId);
        break;
      case 'supplier':
        result = await service.syncSupplier(entity_id, userId);
        break;
      case 'expense':
        result = await service.syncExpenseClaim(entity_id, userId);
        break;
      case 'timesheet':
        result = await service.syncTimesheet(entity_id, userId);
        break;
    }

    return NextResponse.json(result);
  } catch (err) {
    logger.error('ERP sync failed:', err as Record<string, unknown>);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

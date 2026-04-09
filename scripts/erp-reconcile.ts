/**
 * ERPNext Reconciliation Script — Phase 0
 *
 * Detects orphan rows in `erp_sync_map` where:
 *   1. The local Supabase record no longer exists (deleted without clearing the map)
 *   2. The ERPNext document no longer exists (deleted in ERPNext without notifying KP)
 *
 * Output: console report of orphan rows. No deletions — manual review required.
 * Wiring to alerts deferred to Phase 2.
 *
 * Usage:
 *   npx tsx scripts/erp-reconcile.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ERP_BASE = process.env.ERPNEXT_BASE_URL;
const ERP_KEY = process.env.ERPNEXT_API_KEY;
const ERP_SECRET = process.env.ERPNEXT_API_SECRET;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!ERP_BASE || !ERP_KEY || !ERP_SECRET) {
  console.error('Missing ERPNEXT_BASE_URL, ERPNEXT_API_KEY, or ERPNEXT_API_SECRET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Known entity_type → Supabase table mapping
const ENTITY_TABLE_MAP: Record<string, string> = {
  customer: 'accounts',
  contact: 'contacts',
  lead: 'leads',
  opportunity: 'opportunities',
  project: 'projects',
  supplier: 'suppliers',
  item: 'inventory_items',
};

interface SyncMapRow {
  id: string;
  entity_type: string;
  local_id: string | null;
  local_key: string | null;
  erp_doctype: string;
  erp_docname: string;
}

async function checkErpExists(doctype: string, docname: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${ERP_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`,
      {
        headers: { Authorization: `token ${ERP_KEY}:${ERP_SECRET}` },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.warn('ERPNext Reconciliation — orphan detection\n');

  // Fetch all sync map entries
  const { data: syncRows, error } = await supabase
    .from('erp_sync_map')
    .select('id, entity_type, local_id, local_key, erp_doctype, erp_docname')
    .order('entity_type');

  if (error) {
    console.error('Failed to query erp_sync_map:', error.message);
    process.exit(1);
  }

  if (!syncRows || syncRows.length === 0) {
    console.warn('No sync map entries found. Nothing to reconcile.');
    return;
  }

  console.warn(`Found ${syncRows.length} sync map entries\n`);

  const orphansLocal: SyncMapRow[] = [];
  const orphansErp: SyncMapRow[] = [];
  const unknownEntityTypes = new Set<string>();

  // Group by entity_type for batch local checks
  const byType = new Map<string, SyncMapRow[]>();
  for (const row of syncRows as SyncMapRow[]) {
    const group = byType.get(row.entity_type) ?? [];
    group.push(row);
    byType.set(row.entity_type, group);
  }

  // Check local existence per entity type
  for (const [entityType, rows] of byType) {
    const table = ENTITY_TABLE_MAP[entityType];
    if (!table) {
      unknownEntityTypes.add(entityType);
      continue;
    }

    const localIds = rows.map((r) => r.local_id).filter(Boolean) as string[];
    if (localIds.length === 0) continue;

    const { data: existing } = await supabase.from(table).select('id').in('id', localIds);

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    for (const row of rows) {
      if (row.local_id && !existingIds.has(row.local_id)) {
        orphansLocal.push(row);
      }
    }
  }

  // Spot-check ERPNext existence (sample up to 20 rows to avoid hammering ERPNext)
  const sample = syncRows.slice(0, 20) as SyncMapRow[];
  for (const row of sample) {
    const exists = await checkErpExists(row.erp_doctype, row.erp_docname);
    if (!exists) {
      orphansErp.push(row);
    }
  }

  // Report
  console.warn('=== RECONCILIATION REPORT ===\n');

  if (unknownEntityTypes.size > 0) {
    console.warn(`Unknown entity_types (no table mapping): ${[...unknownEntityTypes].join(', ')}`);
  }

  console.warn(
    `\nLocal orphans (Supabase record deleted, sync map remains): ${orphansLocal.length}`,
  );
  for (const row of orphansLocal) {
    console.warn(
      `  [${row.entity_type}] local_id=${row.local_id} → ${row.erp_doctype}/${row.erp_docname}`,
    );
  }

  console.warn(
    `\nERPNext orphans (spot-check ${sample.length}/${syncRows.length}): ${orphansErp.length}`,
  );
  for (const row of orphansErp) {
    console.warn(
      `  [${row.entity_type}] ${row.erp_doctype}/${row.erp_docname} → local_id=${row.local_id}`,
    );
  }

  const totalOrphans = orphansLocal.length + orphansErp.length;
  console.warn(`\nTotal orphans found: ${totalOrphans}`);
  if (totalOrphans > 0) {
    console.warn('Action: Review and manually delete orphan sync_map rows, or re-sync.');
  } else {
    console.warn('No orphans detected. Sync map is clean.');
  }
}

main().catch((err) => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});

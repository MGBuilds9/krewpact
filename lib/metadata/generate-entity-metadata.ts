import type { Metadata } from 'next';

import { createServiceClient } from '@/lib/supabase/server';

type EntityConfig = {
  table: string;
  select: string;
  buildName: (row: Record<string, unknown>) => string;
};

const ENTITY_MAP: Record<string, EntityConfig> = {
  project: {
    table: 'projects',
    select: 'project_name',
    buildName: (row) => String(row['project_name'] ?? ''),
  },
  lead: {
    table: 'leads',
    select: 'company_name',
    buildName: (row) => String(row['company_name'] ?? ''),
  },
  contact: {
    table: 'contacts',
    select: 'first_name,last_name',
    buildName: (row) => [row['first_name'], row['last_name']].filter(Boolean).join(' '),
  },
  account: {
    table: 'accounts',
    select: 'account_name',
    buildName: (row) => String(row['account_name'] ?? ''),
  },
  opportunity: {
    table: 'opportunities',
    select: 'opportunity_name',
    buildName: (row) => String(row['opportunity_name'] ?? ''),
  },
  estimate: {
    table: 'estimates',
    select: 'estimate_number',
    buildName: (row) => (row['estimate_number'] ? `Estimate #${row['estimate_number']}` : ''),
  },
  contract: {
    table: 'contracts',
    select: 'title',
    buildName: (row) => String(row['title'] ?? ''),
  },
  'inventory-item': {
    table: 'inventory_items',
    select: 'name',
    buildName: (row) => String(row['name'] ?? ''),
  },
  'fleet-vehicle': {
    table: 'fleet_vehicles',
    select: 'unit_number',
    buildName: (row) => String(row['unit_number'] ?? ''),
  },
  'purchase-order': {
    table: 'inventory_purchase_orders',
    select: 'po_number',
    buildName: (row) => String(row['po_number'] ?? ''),
  },
  sequence: {
    table: 'sequences',
    select: 'name',
    buildName: (row) => String(row['name'] ?? ''),
  },
  template: {
    table: 'email_templates',
    select: 'name',
    buildName: (row) => String(row['name'] ?? ''),
  },
  bidding: {
    table: 'bidding_opportunities',
    select: 'title',
    buildName: (row) => String(row['title'] ?? ''),
  },
};

export async function generateEntityMetadata(
  entityType: string,
  id: string,
  section?: string,
): Promise<Metadata> {
  const config = ENTITY_MAP[entityType];
  if (!config) {
    return buildFallback(entityType, section);
  }

  try {
    const supabase = createServiceClient();
    const { data } = await supabase.from(config.table).select(config.select).eq('id', id).single();

    if (!data) {
      return buildFallback(entityType, section);
    }

    const name = config.buildName(data as unknown as Record<string, unknown>);
    if (!name) {
      return buildFallback(entityType, section);
    }

    const title = section ? `${name} — ${section} | KrewPact` : `${name} | KrewPact`;
    return { title };
  } catch {
    return buildFallback(entityType, section);
  }
}

function buildFallback(entityType: string, section?: string): Metadata {
  const label = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  const title = section ? `${label} ${section} | KrewPact` : `${label} Details | KrewPact`;
  return { title };
}

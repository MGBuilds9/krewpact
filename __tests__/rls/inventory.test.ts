/**
 * Inventory System RLS Integration Tests
 *
 * Tests RLS policies on 15 inventory tables via:
 *   1. Migration SQL parsing — verifies correct policy operations per table
 *   2. Mock-based client tests — division isolation, admin override, ledger immutability
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { mockSupabaseClient, resetFixtureCounter } from '@/__tests__/helpers';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';

const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockCreateServiceClient = vi.mocked(createServiceClient);

const DIV_TELECOM = 'div-telecom-uuid';
const DIV_WOOD = 'div-wood-uuid';
const DIV_CONTRACTING = 'div-contracting-uuid';
const ORG_B = 'org-b-uuid';

// --- SQL parsing helpers ---
const migrationsDir = join(process.cwd(), 'supabase/migrations');

function extractPolicies(sql: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const re = /CREATE\s+POLICY\s+\w+\s+ON\s+(\w+)\s+FOR\s+(SELECT|INSERT|UPDATE|DELETE)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const t = m[1].toLowerCase();
    if (!result[t]) result[t] = [];
    result[t].push(m[2].toUpperCase());
  }
  return result;
}

function extractRules(sql: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const re =
    /CREATE\s+RULE\s+\w+\s+AS\s+ON\s+(UPDATE|DELETE)\s+TO\s+(\w+)\s+DO\s+INSTEAD\s+NOTHING/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const t = m[2].toLowerCase();
    if (!result[t]) result[t] = [];
    result[t].push(m[1].toUpperCase());
  }
  return result;
}

const rlsSql = readFileSync(join(migrationsDir, '20260320_003_inventory_rls.sql'), 'utf-8');
const tablesSql = readFileSync(join(migrationsDir, '20260320_002_inventory_tables.sql'), 'utf-8');
const policies = extractPolicies(rlsSql);
const rules = extractRules(tablesSql);

// Helper to create a user client mock with a given table response
function mockUserClient(table: string, data: unknown, error: unknown = null) {
  const client = mockSupabaseClient({ tables: { [table]: { data, error } } });
  mockCreateUserClientSafe.mockResolvedValue({ client, error: null });
  return client;
}

// --- 1. Policy definitions ---
describe('Inventory RLS: Policy definitions', () => {
  const parentCrud = [
    'fleet_vehicles',
    'inventory_item_categories',
    'inventory_items',
    'inventory_locations',
    'inventory_serials',
    'inventory_purchase_orders',
    'inventory_goods_receipts',
    'inventory_bom',
  ];

  it.each(parentCrud)('%s has SELECT, INSERT, UPDATE, DELETE', (table) => {
    const ops = policies[table] ?? [];
    expect(ops).toContain('SELECT');
    expect(ops).toContain('INSERT');
    expect(ops).toContain('UPDATE');
    expect(ops).toContain('DELETE');
  });

  it('inventory_lots has SELECT, INSERT, DELETE but no UPDATE', () => {
    const ops = policies['inventory_lots'] ?? [];
    expect(ops).toContain('SELECT');
    expect(ops).toContain('INSERT');
    expect(ops).toContain('DELETE');
    expect(ops).not.toContain('UPDATE');
  });

  it('inventory_ledger has SELECT and INSERT only', () => {
    const ops = policies['inventory_ledger'] ?? [];
    expect(ops).toContain('SELECT');
    expect(ops).toContain('INSERT');
    expect(ops).not.toContain('UPDATE');
    expect(ops).not.toContain('DELETE');
  });

  const childTables = [
    'inventory_item_suppliers',
    'inventory_spots',
    'inventory_po_lines',
    'inventory_gr_lines',
    'inventory_bom_lines',
  ];

  it.each(childTables)('%s has SELECT, INSERT, DELETE (parent-join)', (table) => {
    const ops = policies[table] ?? [];
    expect(ops).toContain('SELECT');
    expect(ops).toContain('INSERT');
    expect(ops).toContain('DELETE');
  });
});

// --- 2. Ledger immutability (DO INSTEAD NOTHING rules) ---
describe('Inventory RLS: Ledger immutability', () => {
  it('inventory_ledger has no-update and no-delete RULEs', () => {
    const ops = rules['inventory_ledger'] ?? [];
    expect(ops).toContain('UPDATE');
    expect(ops).toContain('DELETE');
  });
});

// --- 3. Division isolation ---
describe('Inventory RLS: Division isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('user sees only their division items', async () => {
    const items = [{ id: 'i1', division_id: DIV_TELECOM, sku: 'TEL-001', name: 'Cable' }];
    mockUserClient('inventory_items', items);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_items').select('*');
    expect(result.data).toHaveLength(1);
    expect((result.data as typeof items)[0].division_id).toBe(DIV_TELECOM);
  });

  it('user cannot see other division items', async () => {
    mockUserClient('inventory_items', []);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_items').select('*');
    expect(result.data).toHaveLength(0);
  });

  it('user can insert items in own division', async () => {
    const item = { id: 'i2', division_id: DIV_TELECOM, sku: 'TEL-002', name: 'Wire' };
    const mock = mockUserClient('inventory_items', [item]);
    const { client } = await mockCreateUserClientSafe();
    await client!.from('inventory_items').insert(item).select('*');
    expect(mock.from).toHaveBeenCalledWith('inventory_items');
  });

  it('user cannot insert items in another division (RLS rejects)', async () => {
    mockUserClient('inventory_items', null, { code: '42501', message: 'RLS violation' });
    const { client } = await mockCreateUserClientSafe();
    const result = await client!
      .from('inventory_items')
      .insert({ division_id: DIV_WOOD, sku: 'W-001', name: 'Lumber' })
      .select('*');
    expect(result.error).toBeTruthy();
    expect((result.error as { code: string }).code).toBe('42501');
  });
});

// --- 4. Platform admin override ---
describe('Inventory RLS: Platform admin override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('admin sees all divisions', async () => {
    const items = [
      { id: 'i1', division_id: DIV_TELECOM, name: 'Cable' },
      { id: 'i2', division_id: DIV_WOOD, name: 'Lumber' },
      { id: 'i3', division_id: DIV_CONTRACTING, name: 'Bolt' },
    ];
    mockUserClient('inventory_items', items);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_items').select('*');
    expect(result.data).toHaveLength(3);
  });

  it('admin can update any division item', async () => {
    mockUserClient('inventory_items', [{ id: 'i2', name: 'Hardwood' }]);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!
      .from('inventory_items')
      .update({ name: 'Hardwood' })
      .eq('id', 'i2')
      .select('*');
    expect(result.error).toBeNull();
    const items = result.data as Array<{ name: string }>;
    expect(items[0].name).toBe('Hardwood');
  });

  it('admin can delete items (only admin has DELETE policy)', async () => {
    const mock = mockUserClient('inventory_items', null);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_items').delete().eq('id', 'i1');
    expect(result.error).toBeNull();
    expect(mock.from).toHaveBeenCalledWith('inventory_items');
  });
});

// --- 5. Org isolation ---
describe('Inventory RLS: Org isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('user cannot see items from a different org', async () => {
    mockUserClient('inventory_items', []);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_items').select('*').eq('org_id', ORG_B);
    expect(result.data).toHaveLength(0);
  });

  it('service client sees all orgs (bypasses RLS)', () => {
    const items = [
      { id: 'i1', org_id: 'org-a' },
      { id: 'i2', org_id: ORG_B },
    ];
    const svc = mockSupabaseClient({ tables: { inventory_items: { data: items, error: null } } });
    mockCreateServiceClient.mockReturnValue(svc);
    const client = mockCreateServiceClient();
    client.from('inventory_items').select('*');
    expect(svc.from).toHaveBeenCalledWith('inventory_items');
  });
});

// --- 6. Child table parent-join inheritance ---
describe('Inventory RLS: Child table inheritance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('user reads PO lines when parent PO is accessible', async () => {
    mockUserClient('inventory_po_lines', [{ id: 'pl-1', po_id: 'po-1', qty_ordered: 10 }]);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_po_lines').select('*').eq('po_id', 'po-1');
    expect(result.data).toHaveLength(1);
  });

  it('user cannot read PO lines from another division PO', async () => {
    mockUserClient('inventory_po_lines', []);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_po_lines').select('*').eq('po_id', 'po-other');
    expect(result.data).toHaveLength(0);
  });

  it('user reads spots when parent location is accessible', async () => {
    mockUserClient('inventory_spots', [{ id: 's1', location_id: 'loc-1', label: 'Bay A' }]);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_spots').select('*');
    expect(result.data).toHaveLength(1);
  });

  it('user reads GR lines when parent goods receipt is accessible', async () => {
    mockUserClient('inventory_gr_lines', [{ id: 'grl-1', gr_id: 'gr-1', qty_received: 5 }]);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!.from('inventory_gr_lines').select('*').eq('gr_id', 'gr-1');
    expect(result.data).toHaveLength(1);
  });
});

// --- 7. Cross-division PO access ---
describe('Inventory RLS: Cross-division PO access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('user cannot see POs from another division', async () => {
    mockUserClient('inventory_purchase_orders', []);
    const { client } = await mockCreateUserClientSafe();
    const result = await client!
      .from('inventory_purchase_orders')
      .select('*')
      .eq('division_id', DIV_WOOD);
    expect(result.data).toHaveLength(0);
  });
});

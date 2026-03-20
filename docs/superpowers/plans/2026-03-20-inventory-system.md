# Inventory System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade inventory management system in KrewPact that replaces Almyta, using an append-only double-entry ledger with real-time job costing.

**Architecture:** Append-only inventory ledger in Supabase — every stock movement creates an immutable entry. Current stock = SUM(qty_change). Job cost = SUM(value_change WHERE project_id). POs flow through draft → approved → partially_received → fully_received → closed. ERPNext gets cost journal entries via existing sync pipeline.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL (RLS), Zod validators, React Hook Form, shadcn/ui, Vitest, existing erp sync pipeline

**Spec:** `docs/superpowers/specs/2026-03-20-inventory-system-design.md`

---

## File Structure

### Database Migrations

- Create: `supabase/migrations/20260320_001_inventory_enums.sql`
- Create: `supabase/migrations/20260320_002_inventory_tables.sql`
- Create: `supabase/migrations/20260320_003_inventory_rls.sql`
- Create: `supabase/migrations/20260320_004_inventory_triggers.sql`

### Types

- Modify: `types/supabase.ts` (regenerated after migration)

### Validators

- Create: `lib/validators/inventory.ts`

### Business Logic

- Create: `lib/inventory/items.ts`
- Create: `lib/inventory/ledger.ts`
- Create: `lib/inventory/locations.ts`
- Create: `lib/inventory/purchase-orders.ts`
- Create: `lib/inventory/goods-receipts.ts`
- Create: `lib/inventory/serials.ts`
- Create: `lib/inventory/fleet.ts`
- Create: `lib/inventory/stock-summary.ts`

### API Routes

- Create: `app/api/inventory/items/route.ts` (GET list, POST create)
- Create: `app/api/inventory/items/[id]/route.ts` (GET, PATCH, DELETE)
- Create: `app/api/inventory/locations/route.ts`
- Create: `app/api/inventory/locations/[id]/route.ts`
- Create: `app/api/inventory/purchase-orders/route.ts`
- Create: `app/api/inventory/purchase-orders/[id]/route.ts`
- Create: `app/api/inventory/purchase-orders/[id]/approve/route.ts`
- Create: `app/api/inventory/goods-receipts/route.ts`
- Create: `app/api/inventory/goods-receipts/[id]/route.ts`
- Create: `app/api/inventory/goods-receipts/[id]/confirm/route.ts`
- Create: `app/api/inventory/transactions/route.ts` (POST issue/return/transfer/adjust)
- Create: `app/api/inventory/serials/route.ts`
- Create: `app/api/inventory/serials/[id]/route.ts`
- Create: `app/api/inventory/serials/[id]/checkout/route.ts`
- Create: `app/api/inventory/serials/[id]/return/route.ts`
- Create: `app/api/inventory/fleet/route.ts`
- Create: `app/api/inventory/fleet/[id]/route.ts`
- Create: `app/api/inventory/stock/route.ts` (GET stock summary)
- Create: `app/api/inventory/stock/by-project/[projectId]/route.ts`

### Dashboard Pages

- Create: `app/(dashboard)/org/[orgSlug]/inventory/page.tsx` (stock overview)
- Create: `app/(dashboard)/org/[orgSlug]/inventory/items/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/items/[id]/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/items/new/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/locations/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/purchase-orders/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/purchase-orders/[id]/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/purchase-orders/new/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/receive/[poId]/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/transactions/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/fleet/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/fleet/[id]/page.tsx`

### Components

- Create: `components/inventory/items-table.tsx`
- Create: `components/inventory/item-form.tsx`
- Create: `components/inventory/stock-card.tsx`
- Create: `components/inventory/location-select.tsx`
- Create: `components/inventory/po-form.tsx`
- Create: `components/inventory/po-line-editor.tsx`
- Create: `components/inventory/receive-form.tsx`
- Create: `components/inventory/transaction-form.tsx`
- Create: `components/inventory/serial-tracker.tsx`
- Create: `components/inventory/fleet-table.tsx`
- Create: `components/inventory/fleet-form.tsx`

### Hooks

- Create: `hooks/use-inventory-items.ts`
- Create: `hooks/use-inventory-stock.ts`
- Create: `hooks/use-inventory-locations.ts`
- Create: `hooks/use-purchase-orders.ts`
- Create: `hooks/use-fleet-vehicles.ts`

### ERP Sync

- Create: `lib/erp/sync-handlers/sync-inventory-po.ts`
- Create: `lib/erp/sync-handlers/sync-goods-receipt.ts`
- Create: `lib/erp/sync-handlers/sync-material-cost.ts`

### Migration Script (Almyta → Supabase)

- Create: `scripts/inventory-migration/extract-almyta.sh`
- Create: `scripts/inventory-migration/transform.ts`
- Create: `scripts/inventory-migration/load.ts`
- Create: `scripts/inventory-migration/verify.ts`

### Tests

- Create: `__tests__/lib/inventory/ledger.test.ts`
- Create: `__tests__/lib/inventory/items.test.ts`
- Create: `__tests__/lib/inventory/purchase-orders.test.ts`
- Create: `__tests__/lib/inventory/goods-receipts.test.ts`
- Create: `__tests__/lib/inventory/serials.test.ts`
- Create: `__tests__/lib/inventory/stock-summary.test.ts`
- Create: `__tests__/api/inventory/items.test.ts`
- Create: `__tests__/api/inventory/transactions.test.ts`
- Create: `__tests__/api/inventory/purchase-orders.test.ts`
- Create: `__tests__/api/inventory/goods-receipts.test.ts`
- Create: `__tests__/api/inventory/serials.test.ts`
- Create: `__tests__/api/inventory/fleet.test.ts`
- Create: `__tests__/validators/inventory.test.ts`
- Create: `__tests__/rls/inventory.test.ts`

### Feature Flag

- Modify: `lib/feature-flags.ts` (add `inventory_management: false`)

---

## Task 1: Database Schema — Enums and Foundation Tables

**Files:**

- Create: `supabase/migrations/20260320_001_inventory_enums.sql`
- Create: `supabase/migrations/20260320_002_inventory_tables.sql`

**Dependencies:** None. This is the first task — everything else depends on it.

- [ ] **Step 1: Write enum migration**

Create `supabase/migrations/20260320_001_inventory_enums.sql` with all inventory enums. Copy exact SQL from spec Section "New Enums":

- `inventory_tracking_type` (none, serial, lot)
- `inventory_valuation_method` (weighted_average, specific_identification)
- `inventory_uom` (each, meter, foot, spool, box, kg, lb, liter, pack, roll, sheet, pair)
- `inventory_location_type` (warehouse, job_site, vehicle)
- `inventory_transaction_type` (purchase_receipt, purchase_return, material_issue, material_return, stock_transfer, stock_adjustment, scrap, tool_checkout, tool_return, initial_stock)
- `inventory_po_status` (draft, submitted, approved, partially_received, fully_received, closed, cancelled)
- `inventory_gr_status` (draft, confirmed)
- `serial_status` (in_stock, checked_out, in_transit, maintenance, quarantine, decommissioned)
- `fleet_vehicle_type` (truck, van, trailer, heavy_equipment, other)
- `fleet_vehicle_status` (active, maintenance, decommissioned)
- `fleet_ownership_type` (owned, leased, rented)

- [ ] **Step 2: Write tables migration**

Create `supabase/migrations/20260320_002_inventory_tables.sql` with all 13 tables in FK dependency order:

1. `fleet_vehicles`
2. `inventory_item_categories`
3. `inventory_items`
4. `inventory_item_suppliers`
5. `inventory_locations` (references fleet_vehicles, projects)
6. `inventory_spots`
7. `inventory_serials` (references inventory_items, inventory_locations)
8. `inventory_lots`
9. `inventory_ledger` (references everything — must be last of core tables)
10. `inventory_purchase_orders`
11. `inventory_po_lines`
12. `inventory_goods_receipts`
13. `inventory_gr_lines`
14. `inventory_bom`
15. `inventory_bom_lines`

Every **parent/domain table** MUST include:

- `org_id UUID NOT NULL DEFAULT default_org_id()` (verified function exists)
- `division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT` (matches existing pattern — `projects` uses RESTRICT)
- `created_by UUID REFERENCES users(id) ON DELETE SET NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

**Exception — child/junction tables follow the spec exactly:**

- `inventory_item_suppliers` — no org_id, no division_id, no created_by (inherits scope from parent item+supplier)
- `inventory_spots` — no org_id, no division_id, no created_by (inherits from parent location)
- `inventory_po_lines` — no org_id, no division_id, no created_by (inherits from parent PO)
- `inventory_gr_lines` — no org_id, no division_id, no created_by (inherits from parent GR)
- `inventory_bom_lines` — no org_id, no division_id, no created_by (inherits from parent BOM)
- `inventory_lots` — has org_id and division_id but NO created_by or updated_at (immutable after creation)

Include performance indexes on `inventory_ledger`:

```sql
CREATE INDEX idx_ledger_item_location ON inventory_ledger(item_id, location_id);
CREATE INDEX idx_ledger_project ON inventory_ledger(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_ledger_transacted_at ON inventory_ledger(transacted_at);
CREATE INDEX idx_ledger_serial ON inventory_ledger(serial_id) WHERE serial_id IS NOT NULL;
CREATE INDEX idx_ledger_division ON inventory_ledger(division_id, transacted_at);
```

Include all CHECK constraints from spec:

- `chk_job_site_needs_project` on inventory_locations
- `chk_vehicle_needs_fleet` on inventory_locations
- `chk_issue_needs_project` on inventory_ledger
- `chk_adjustment_needs_reason` on inventory_ledger
- `qty_change != 0` on inventory_ledger

Include UNIQUE constraints:

- `inventory_items(division_id, sku)`
- `inventory_item_suppliers(item_id, supplier_id)`
- `inventory_spots(location_id, name)`
- `inventory_serials(item_id, serial_number)`
- `inventory_lots(item_id, lot_number)`
- `fleet_vehicles(division_id, unit_number)`
- `inventory_purchase_orders(po_number)` — globally unique
- `inventory_goods_receipts(gr_number)` — globally unique

Include the immutability rules on ledger:

```sql
CREATE RULE inventory_ledger_no_update AS ON UPDATE TO inventory_ledger DO INSTEAD NOTHING;
CREATE RULE inventory_ledger_no_delete AS ON DELETE TO inventory_ledger DO INSTEAD NOTHING;
```

Include the materialized view:

```sql
CREATE MATERIALIZED VIEW inventory_stock_summary AS ...
```

- [ ] **Step 3: Apply migrations to Supabase**

Use Supabase MCP `apply_migration` tool for each file in order. Verify no errors.

- [ ] **Step 4: Verify schema in live DB**

Run SQL to confirm:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'inventory_%' OR table_name = 'fleet_vehicles'
ORDER BY table_name;
```

Expected: 15 tables + 1 materialized view.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260320_001_inventory_enums.sql supabase/migrations/20260320_002_inventory_tables.sql
git commit -m "feat(inventory): add inventory schema — enums, 15 tables, ledger, materialized view"
```

---

## Task 2: RLS Policies and Triggers

**Files:**

- Create: `supabase/migrations/20260320_003_inventory_rls.sql`
- Create: `supabase/migrations/20260320_004_inventory_triggers.sql`

**Dependencies:** Task 1 (tables must exist)

- [ ] **Step 1: Write RLS policies**

For each inventory table, create policies following the exact pattern from `projects`:

```sql
-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- SELECT: org + division scoped, admin override
CREATE POLICY inventory_items_select ON inventory_items
  FOR SELECT USING (
    (org_id::text = krewpact_org_id())
    AND (
      division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions()))
      OR is_platform_admin()
    )
  );

-- INSERT: org + division scoped
CREATE POLICY inventory_items_insert ON inventory_items
  FOR INSERT WITH CHECK (
    (org_id::text = krewpact_org_id())
    AND (
      division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions()))
      OR is_platform_admin()
    )
  );

-- UPDATE: division scoped + admin
CREATE POLICY inventory_items_update ON inventory_items
  FOR UPDATE USING (
    (division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions()))
    OR is_platform_admin())
  );

-- DELETE: admin only
CREATE POLICY inventory_items_delete ON inventory_items
  FOR DELETE USING (is_platform_admin());
```

Repeat for ALL inventory tables. Special case: `inventory_ledger` has NO update/delete policies (already blocked by RULE).

For child tables without division_id, use parent-join RLS policies:

```sql
-- Example: inventory_po_lines inherits access from parent PO
ALTER TABLE inventory_po_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY inventory_po_lines_select ON inventory_po_lines
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM inventory_purchase_orders po
      WHERE po.id = inventory_po_lines.po_id
      AND po.org_id::text = krewpact_org_id()
      AND (po.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions()))
           OR is_platform_admin()))
  );

-- Same pattern for INSERT/UPDATE with WITH CHECK
CREATE POLICY inventory_po_lines_insert ON inventory_po_lines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM inventory_purchase_orders po
      WHERE po.id = inventory_po_lines.po_id
      AND po.org_id::text = krewpact_org_id()
      AND (po.division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions()))
           OR is_platform_admin()))
  );

CREATE POLICY inventory_po_lines_delete ON inventory_po_lines
  FOR DELETE USING (is_platform_admin());
```

Apply same parent-join pattern to:

- `inventory_spots` → join through `inventory_locations`
- `inventory_gr_lines` → join through `inventory_goods_receipts`
- `inventory_bom_lines` → join through `inventory_bom`
- `inventory_item_suppliers` → join through `inventory_items`

- [ ] **Step 2: Write triggers**

Create `updated_at` triggers for all mutable tables (NOT inventory_ledger — it's append-only):

```sql
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_serials_updated_at BEFORE UPDATE ON inventory_serials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_purchase_orders_updated_at BEFORE UPDATE ON inventory_purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_po_lines_updated_at BEFORE UPDATE ON inventory_po_lines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_goods_receipts_updated_at BEFORE UPDATE ON inventory_goods_receipts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_item_categories_updated_at BEFORE UPDATE ON inventory_item_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_item_suppliers_updated_at BEFORE UPDATE ON inventory_item_suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_bom_updated_at BEFORE UPDATE ON inventory_bom FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fleet_vehicles_updated_at BEFORE UPDATE ON fleet_vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 3: Apply migrations**

Use Supabase MCP `apply_migration` for both files.

- [ ] **Step 4: Verify RLS is enabled**

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND (tablename LIKE 'inventory_%' OR tablename = 'fleet_vehicles');
```

Expected: all show `rowsecurity = true`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260320_003_inventory_rls.sql supabase/migrations/20260320_004_inventory_triggers.sql
git commit -m "feat(inventory): add RLS policies and updated_at triggers"
```

---

## Task 3: Regenerate Supabase Types and Feature Flag

**Files:**

- Modify: `types/supabase.ts` (regenerated)
- Modify: `lib/feature-flags.ts`

**Dependencies:** Tasks 1-2 (schema must be live)

- [ ] **Step 1: Regenerate Supabase types**

```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts 2>/dev/null
```

Get project ID from `.env.local` or `supabase/config.toml`. Verify the new types include `inventory_items`, `inventory_ledger`, etc.

- [ ] **Step 2: Add feature flag**

In `lib/feature-flags.ts`, add `inventory_management: false` to the features object:

```typescript
export const features = {
  // ... existing flags ...
  inventory_management: false,
} as const;
```

- [ ] **Step 3: Verify types compile**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add types/supabase.ts lib/feature-flags.ts
git commit -m "feat(inventory): regenerate types, add inventory_management feature flag"
```

---

## Task 4: Zod Validators

**Files:**

- Create: `lib/validators/inventory.ts`
- Create: `__tests__/validators/inventory.test.ts`

**Dependencies:** Task 3 (types must exist)

- [ ] **Step 1: Write failing validator tests**

Test schemas for: item create/update, location create, PO create, PO line, GR create, GR line, transaction (issue/return/transfer/adjust), serial create, fleet vehicle create.

Key validations to test:

- `sku` is required, trimmed, max 50 chars
- `qty_change` cannot be zero
- `transaction_type: 'material_issue'` requires `project_id`
- `transaction_type: 'stock_adjustment'` requires `reason_code`
- `unit_price` must be >= 0
- PO `status` only accepts valid enum values
- Location type `job_site` requires `project_id`
- Location type `vehicle` requires `linked_vehicle_id`

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- __tests__/validators/inventory.test.ts
```

- [ ] **Step 3: Write validators**

Create `lib/validators/inventory.ts` with Zod schemas. Follow patterns from existing validators (e.g., `lib/validators/projects.ts`). Export: `createItemSchema`, `updateItemSchema`, `createLocationSchema`, `createPurchaseOrderSchema`, `poLineSchema`, `createGoodsReceiptSchema`, `grLineSchema`, `createTransactionSchema`, `createSerialSchema`, `createFleetVehicleSchema`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- __tests__/validators/inventory.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/validators/inventory.ts __tests__/validators/inventory.test.ts
git commit -m "feat(inventory): add Zod validators with tests"
```

---

## Task 5: Core Business Logic — Ledger and Stock

**Files:**

- Create: `lib/inventory/ledger.ts`
- Create: `lib/inventory/stock-summary.ts`
- Create: `__tests__/lib/inventory/ledger.test.ts`
- Create: `__tests__/lib/inventory/stock-summary.test.ts`

**Dependencies:** Tasks 3-4

- [ ] **Step 1: Write failing ledger tests**

Test core ledger operations:

- `createLedgerEntry()` — creates an immutable entry with correct fields
- `getStockAtLocation()` — returns SUM(qty_change) for item+location
- `getJobCost()` — returns SUM(value_change) for project
- Transfer creates TWO entries (negative at source, positive at destination)
- Validation: rejects qty_change = 0, rejects issue without project_id

- [ ] **Step 2: Run tests — verify fail**

- [ ] **Step 3: Implement ledger.ts**

Core functions:

- `createLedgerEntry(supabase, entry)` — validates, inserts, returns entry
- `createTransferEntries(supabase, transfer)` — creates paired entries in a transaction
- `getStockAtLocation(supabase, itemId, locationId)` — queries materialized view
- `getJobMaterialCost(supabase, projectId)` — aggregates from ledger
- `refreshStockSummary(supabase)` — refreshes materialized view

Use `createServiceClient()` for background operations, `createUserClientSafe()` for user-initiated.

- [ ] **Step 4: Write stock-summary.ts**

Functions for reading the materialized view:

- `getStockSummary(supabase, filters)` — paginated stock list with item/location joins
- `getLowStockItems(supabase, divisionId)` — items where qty_on_hand < min_stock_level
- `getStockByProject(supabase, projectId)` — all material issued to a project

- [ ] **Step 5: Run tests — verify pass**

- [ ] **Step 6: Commit**

```bash
git add lib/inventory/ledger.ts lib/inventory/stock-summary.ts __tests__/lib/inventory/ledger.test.ts __tests__/lib/inventory/stock-summary.test.ts
git commit -m "feat(inventory): core ledger and stock summary logic with tests"
```

---

## Task 6: Business Logic — Items, Locations, Fleet

**Files:**

- Create: `lib/inventory/items.ts`
- Create: `lib/inventory/locations.ts`
- Create: `lib/inventory/fleet.ts`
- Create: `__tests__/lib/inventory/items.test.ts`

**Dependencies:** Tasks 3-4

- [ ] **Step 1: Write failing tests for items CRUD**

- [ ] **Step 2: Implement items.ts**

Functions: `createItem`, `updateItem`, `getItem`, `listItems` (paginated, filterable by division/category/tracking_type/is_active), `deactivateItem`.

- [ ] **Step 3: Implement locations.ts**

Functions: `createLocation`, `updateLocation`, `listLocations` (filterable by type/division), `getLocationWithSpots`. Enforce: vehicle type requires `linked_vehicle_id`, job_site requires `project_id`.

- [ ] **Step 4: Implement fleet.ts**

Functions: `createVehicle`, `updateVehicle`, `listVehicles`, `decommissionVehicle`. On create: optionally auto-create an `inventory_location` of type `vehicle` linked to it.

- [ ] **Step 5: Run all tests — verify pass**

- [ ] **Step 6: Commit**

```bash
git add lib/inventory/items.ts lib/inventory/locations.ts lib/inventory/fleet.ts __tests__/lib/inventory/items.test.ts
git commit -m "feat(inventory): items, locations, fleet business logic"
```

---

## Task 7: Business Logic — Purchase Orders and Goods Receipts

**Files:**

- Create: `lib/inventory/purchase-orders.ts`
- Create: `lib/inventory/goods-receipts.ts`
- Create: `__tests__/lib/inventory/purchase-orders.test.ts`
- Create: `__tests__/lib/inventory/goods-receipts.test.ts`

**Dependencies:** Tasks 5-6

- [ ] **Step 1: Write failing PO tests**

Test: create PO with lines, approve PO, PO status transitions (draft→submitted→approved), cannot approve without lines.

- [ ] **Step 2: Implement purchase-orders.ts**

Functions: `createPurchaseOrder`, `addPoLine`, `updatePoLine`, `removePoLine`, `submitPo`, `approvePo`, `cancelPo`, `getPurchaseOrder`, `listPurchaseOrders`.

PO number generation: `PO-{DIV_CODE}-{YEAR}-{SEQ}` (e.g., PO-TEL-2026-0001). Use a Supabase sequence or max+1 query.

- [ ] **Step 3: Write failing GR tests**

Test: create GR against PO, confirm GR creates ledger entries, partial receive updates PO line qty_received, PO status transitions to partially_received then fully_received.

**Critical atomicity test:** If serial creation fails mid-confirm (e.g., duplicate serial number), verify that NO ledger entries are committed and NO PO line qty_received updates are saved. The entire `confirmGoodsReceipt` operation must be all-or-nothing.

- [ ] **Step 4: Implement goods-receipts.ts**

Functions: `createGoodsReceipt`, `addGrLine`, `confirmGoodsReceipt` (this is the critical one — creates ledger entries in a transaction), `getGoodsReceipt`, `listGoodsReceipts`.

`confirmGoodsReceipt` must atomically:

1. Insert `purchase_receipt` ledger entries (one per GR line)
2. Update `inventory_po_lines.qty_received` for each line
3. Update PO status based on total received vs ordered
4. If serial-tracked items: create `inventory_serials` records
5. If lot-tracked items: create/update `inventory_lots` records
6. Set GR status to `confirmed`

All in a single Supabase RPC or transaction.

- [ ] **Step 5: Run all tests — verify pass**

- [ ] **Step 6: Commit**

```bash
git add lib/inventory/purchase-orders.ts lib/inventory/goods-receipts.ts __tests__/lib/inventory/purchase-orders.test.ts __tests__/lib/inventory/goods-receipts.test.ts
git commit -m "feat(inventory): PO lifecycle and goods receipt with ledger integration"
```

---

## Task 8: Business Logic — Serial Tracking and Transactions

**Files:**

- Create: `lib/inventory/serials.ts`
- Create: `__tests__/lib/inventory/serials.test.ts`
- Create: `__tests__/api/inventory/transactions.test.ts`

**Dependencies:** Task 5 (ledger)

- [ ] **Step 1: Write failing serial tests**

Test: checkout creates ledger entry + updates serial status, return creates ledger entry + resets status, cannot checkout already checked-out serial.

- [ ] **Step 2: Implement serials.ts**

Functions: `checkoutSerial` (creates `tool_checkout` ledger entry, updates serial.status and checked_out_to), `returnSerial` (creates `tool_return` ledger entry, resets status), `getSerial`, `listSerials` (filterable by status/location/checked_out_to), `getSerialHistory` (ledger entries for this serial).

- [ ] **Step 3: Write transaction API tests**

Test API route for material_issue, material_return, stock_transfer, stock_adjustment — each validates required fields and creates correct ledger entries.

- [ ] **Step 4: Run all tests — verify pass**

- [ ] **Step 5: Commit**

```bash
git add lib/inventory/serials.ts __tests__/lib/inventory/serials.test.ts __tests__/api/inventory/transactions.test.ts
git commit -m "feat(inventory): serial tracking and transaction API tests"
```

---

## Task 9: API Routes — Items, Locations, Fleet, Stock

**Files:**

- Create: `app/api/inventory/items/route.ts`
- Create: `app/api/inventory/items/[id]/route.ts`
- Create: `app/api/inventory/locations/route.ts`
- Create: `app/api/inventory/locations/[id]/route.ts`
- Create: `app/api/inventory/fleet/route.ts`
- Create: `app/api/inventory/fleet/[id]/route.ts`
- Create: `app/api/inventory/stock/route.ts`
- Create: `app/api/inventory/stock/by-project/[projectId]/route.ts`
- Create: `__tests__/api/inventory/items.test.ts`
- Create: `__tests__/api/inventory/fleet.test.ts`

**Dependencies:** Tasks 4-6

All API routes follow existing KrewPact patterns:

1. Auth check: `const { userId } = await auth();` (Clerk)
2. Validate input: Zod schema from `lib/validators/inventory.ts`
3. Feature gate: `if (!isFeatureEnabled('inventory_management'))` return 404
4. Call business logic from `lib/inventory/`
5. Return structured JSON response
6. Never expose raw DB errors

- [ ] **Step 1: Write failing API tests for items CRUD**

- [ ] **Step 2: Implement items routes**

GET `/api/inventory/items` — list with pagination, filters (division, category, tracking_type, search)
POST `/api/inventory/items` — create item, validate with `createItemSchema`
GET `/api/inventory/items/[id]` — get single item with supplier mappings
PATCH `/api/inventory/items/[id]` — update item
DELETE `/api/inventory/items/[id]` — deactivate (soft delete via is_active=false)

- [ ] **Step 3: Implement locations, fleet, stock routes**

Follow same pattern. Stock routes are read-only (query materialized view).

- [ ] **Step 4: Run tests — verify pass**

- [ ] **Step 5: Commit**

```bash
git add app/api/inventory/ __tests__/api/inventory/items.test.ts __tests__/api/inventory/fleet.test.ts
git commit -m "feat(inventory): API routes for items, locations, fleet, stock"
```

---

## Task 10: API Routes — POs, Receiving, Transactions, Serials

**Files:**

- Create: `app/api/inventory/purchase-orders/route.ts`
- Create: `app/api/inventory/purchase-orders/[id]/route.ts`
- Create: `app/api/inventory/purchase-orders/[id]/approve/route.ts`
- Create: `app/api/inventory/goods-receipts/route.ts`
- Create: `app/api/inventory/goods-receipts/[id]/route.ts`
- Create: `app/api/inventory/goods-receipts/[id]/confirm/route.ts`
- Create: `app/api/inventory/transactions/route.ts`
- Create: `app/api/inventory/serials/route.ts`
- Create: `app/api/inventory/serials/[id]/route.ts`
- Create: `app/api/inventory/serials/[id]/checkout/route.ts`
- Create: `app/api/inventory/serials/[id]/return/route.ts`
- Create: `__tests__/api/inventory/purchase-orders.test.ts`
- Create: `__tests__/api/inventory/goods-receipts.test.ts`
- Create: `__tests__/api/inventory/serials.test.ts`

**Dependencies:** Tasks 7-8

- [ ] **Step 1: Write failing tests for PO, GR, transaction, serial APIs**

- [ ] **Step 2: Implement PO routes**

POST `/api/inventory/purchase-orders` — create PO with lines
GET `/api/inventory/purchase-orders` — list with filters (status, supplier, date range)
GET `/api/inventory/purchase-orders/[id]` — detail with lines
POST `/api/inventory/purchase-orders/[id]/approve` — approve (requires appropriate role)

- [ ] **Step 3: Implement GR routes**

POST `/api/inventory/goods-receipts` — create GR against a PO
POST `/api/inventory/goods-receipts/[id]/confirm` — confirm receipt (creates ledger entries)

- [ ] **Step 4: Implement transaction and serial routes**

POST `/api/inventory/transactions` — issue, return, transfer, adjust (dispatches to ledger)
POST `/api/inventory/serials/[id]/checkout` — check out to user
POST `/api/inventory/serials/[id]/return` — return from user

- [ ] **Step 5: Run all tests — verify pass**

- [ ] **Step 6: Commit**

```bash
git add app/api/inventory/ __tests__/api/inventory/
git commit -m "feat(inventory): API routes for POs, receiving, transactions, serials"
```

---

## Task 11: React Hooks

**Files:**

- Create: `hooks/use-inventory-items.ts`
- Create: `hooks/use-inventory-stock.ts`
- Create: `hooks/use-inventory-locations.ts`
- Create: `hooks/use-purchase-orders.ts`
- Create: `hooks/use-fleet-vehicles.ts`

**Dependencies:** Task 9 (API routes)

- [ ] **Step 1: Create hooks**

Follow existing patterns (check `hooks/` for convention). Each hook wraps API calls with React Query:

- `useInventoryItems(filters)` — paginated list, search, category filter
- `useInventoryItem(id)` — single item detail
- `useCreateItem()`, `useUpdateItem()` — mutations with optimistic updates
- `useInventoryStock(filters)` — stock summary view
- `useStockByProject(projectId)` — material cost for a project
- `useInventoryLocations(filters)` — filterable by type
- `usePurchaseOrders(filters)` — PO list
- `usePurchaseOrder(id)` — PO detail with lines
- `useCreatePurchaseOrder()`, `useApprovePo()` — mutations
- `useFleetVehicles(filters)` — vehicle list

Use query keys from `lib/query-keys.ts` — add inventory keys there.

- [ ] **Step 2: Add query keys**

In `lib/query-keys.ts`, add:

```typescript
inventory: {
  items: (filters?: any) => ['inventory', 'items', filters],
  item: (id: string) => ['inventory', 'items', id],
  stock: (filters?: any) => ['inventory', 'stock', filters],
  stockByProject: (projectId: string) => ['inventory', 'stock', 'project', projectId],
  locations: (filters?: any) => ['inventory', 'locations', filters],
  purchaseOrders: (filters?: any) => ['inventory', 'purchase-orders', filters],
  purchaseOrder: (id: string) => ['inventory', 'purchase-orders', id],
  fleet: (filters?: any) => ['inventory', 'fleet', filters],
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/use-inventory-*.ts hooks/use-purchase-orders.ts hooks/use-fleet-vehicles.ts lib/query-keys.ts
git commit -m "feat(inventory): React hooks for inventory data fetching"
```

---

## Task 12: Dashboard UI — Items and Stock Overview

**Files:**

- Create: `app/(dashboard)/org/[orgSlug]/inventory/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/items/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/items/[id]/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/items/new/page.tsx`
- Create: `components/inventory/items-table.tsx`
- Create: `components/inventory/item-form.tsx`
- Create: `components/inventory/stock-card.tsx`
- Create: `components/inventory/location-select.tsx`

**Dependencies:** Task 11 (hooks)

- [ ] **Step 1: Build inventory overview page**

`inventory/page.tsx` — dashboard with:

- Stock summary cards (total items, low stock count, items by location type)
- Quick actions: "New Item", "Create PO", "Receive Materials"
- Recent transactions list (last 10 ledger entries)

Use shadcn/ui `Card`, `Table`, `Badge`. Dark mode. Geist font. Follow existing dashboard card patterns.

- [ ] **Step 2: Build items list page**

`inventory/items/page.tsx` — data table with:

- Search by name/SKU
- Filter by category, tracking type, active/inactive
- Columns: SKU, Name, Category, UOM, In Stock, Value, Status
- "In Stock" comes from stock summary materialized view

Use existing data table patterns from CRM (check `app/(dashboard)/org/[orgSlug]/crm/` for reference).

- [ ] **Step 3: Build item form (create/edit)**

`components/inventory/item-form.tsx` — React Hook Form + Zod:

- Fields: SKU, Name, Description, Category (select), UOM (select), Tracking Type (radio), Valuation Method (select), Manufacturer, Model Number, Barcode, Min/Max/Reorder levels, Default Supplier (select from portal_accounts)
- Conditional fields: secondary UOM + conversion factor only when secondary_uom is set

- [ ] **Step 4: Build item detail page**

`inventory/items/[id]/page.tsx`:

- Item details card
- Current stock by location (from materialized view)
- Transaction history (ledger entries for this item)
- Supplier mappings tab
- Serial numbers tab (if tracking_type = serial)

- [ ] **Step 5: Add nav item (feature-gated)**

In the navigation component, add "Inventory" item gated behind `isFeatureEnabled('inventory_management')`. Check existing nav structure in the layout file.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/org/[orgSlug]/inventory/ components/inventory/
git commit -m "feat(inventory): dashboard UI for items and stock overview"
```

---

## Task 13: Dashboard UI — POs, Receiving, Transactions

**Files:**

- Create: `app/(dashboard)/org/[orgSlug]/inventory/purchase-orders/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/purchase-orders/[id]/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/purchase-orders/new/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/receive/[poId]/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/transactions/page.tsx`
- Create: `components/inventory/po-form.tsx`
- Create: `components/inventory/po-line-editor.tsx`
- Create: `components/inventory/receive-form.tsx`
- Create: `components/inventory/transaction-form.tsx`

**Dependencies:** Task 12

- [ ] **Step 1: Build PO list page**

Table with: PO Number, Supplier, Date, Status (badge), Total, Lines count. Filter by status, date range.

- [ ] **Step 2: Build PO creation form**

Multi-step or single page:

1. Select supplier (from portal_accounts where actor_type = 'trade_partner')
2. Select delivery location
3. Add line items (item picker + qty + unit price)
4. Review totals
5. Submit

`po-line-editor.tsx` — inline add/edit/remove lines with running total.

- [ ] **Step 3: Build PO detail page**

Shows PO header, lines with received vs ordered, approval status, linked GRs. Actions: Approve (if draft/submitted), Cancel, Create Goods Receipt.

- [ ] **Step 4: Build receiving page**

`receive/[poId]/page.tsx`:

- Shows PO lines with remaining quantities
- For each line: enter qty received, actual unit price, spot location
- For serial-tracked items: enter serial numbers
- Submit creates GR → confirms → creates ledger entries

- [ ] **Step 5: Build transactions page**

Transaction log (ledger entries) with filters: date range, transaction type, item, location, project. Read-only — the ledger is the audit trail.

- [ ] **Step 6: Commit**

```bash
git add app/(dashboard)/org/[orgSlug]/inventory/ components/inventory/
git commit -m "feat(inventory): PO creation, receiving, and transaction history UI"
```

---

## Task 14: Dashboard UI — Fleet and Serials

**Files:**

- Create: `app/(dashboard)/org/[orgSlug]/inventory/fleet/page.tsx`
- Create: `app/(dashboard)/org/[orgSlug]/inventory/fleet/[id]/page.tsx`
- Create: `components/inventory/fleet-table.tsx`
- Create: `components/inventory/fleet-form.tsx`
- Create: `components/inventory/serial-tracker.tsx`

**Dependencies:** Task 12

- [ ] **Step 1: Build fleet list page**

Table: Unit Number, Year/Make/Model, Type, Status, Assigned To, License Plate. Filter by status, type.

- [ ] **Step 2: Build fleet detail/form**

Create/edit vehicle. On create, option to auto-create inventory location.

- [ ] **Step 3: Build serial tracker component**

Reusable component showing serial-tracked items: Serial Number, Item Name, Status (badge), Location, Checked Out To, Warranty Expiry. Actions: Checkout, Return. Used on item detail page and as standalone tool-tracking view.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/org/[orgSlug]/inventory/fleet/ components/inventory/
git commit -m "feat(inventory): fleet management and serial tracker UI"
```

---

## Task 15: RLS Integration Tests

**Files:**

- Create: `__tests__/rls/inventory.test.ts`

**Dependencies:** Tasks 1-2

- [ ] **Step 1: Write RLS tests**

Test that:

- User in Telecom division can read Telecom inventory items, cannot read Wood items
- User can create items in their division only
- Platform admin can read/write all divisions
- Ledger entries cannot be updated or deleted (RULE enforcement)
- Users cannot see items from other orgs

Follow existing patterns in `__tests__/rls/` directory.

- [ ] **Step 2: Run tests — verify pass**

- [ ] **Step 3: Commit**

```bash
git add __tests__/rls/inventory.test.ts
git commit -m "test(inventory): RLS policy integration tests"
```

---

## Task 16: ERPNext Sync Handlers

**Files:**

- Create: `lib/erp/sync-handlers/sync-inventory-po.ts`
- Create: `lib/erp/sync-handlers/sync-goods-receipt.ts`
- Create: `lib/erp/sync-handlers/sync-material-cost.ts`

**Dependencies:** Tasks 7, 9

- [ ] **Step 1: Study existing sync handler pattern**

Read `lib/erp/sync-handlers/sync-supplier.ts` and `lib/erp/sync-service.ts` for the exact pattern.

- [ ] **Step 2: Implement sync-inventory-po.ts**

Maps `inventory_purchase_orders` → ERPNext `Purchase Order` doctype. Triggered when PO reaches `approved` status. Maps: po_number → name, supplier → supplier, lines → items.

- [ ] **Step 3: Implement sync-goods-receipt.ts**

Maps `inventory_goods_receipts` → ERPNext `Purchase Receipt`. Triggered on GR confirmation.

- [ ] **Step 4: Implement sync-material-cost.ts**

Aggregates ledger entries by project for a date range → ERPNext `Journal Entry`. Meant to run as daily cron. Debits project cost center, credits inventory asset account.

- [ ] **Step 5: Register handlers in sync-service.ts**

Add the new handlers to the sync service dispatcher.

- [ ] **Step 6: Commit**

```bash
git add lib/erp/sync-handlers/sync-inventory-po.ts lib/erp/sync-handlers/sync-goods-receipt.ts lib/erp/sync-handlers/sync-material-cost.ts lib/erp/sync-service.ts
git commit -m "feat(inventory): ERPNext sync handlers for POs, receipts, and cost journals"
```

---

## Task 17: Almyta Data Migration Script

**Files:**

- Create: `scripts/inventory-migration/extract-almyta.sh`
- Create: `scripts/inventory-migration/transform.ts`
- Create: `scripts/inventory-migration/load.ts`
- Create: `scripts/inventory-migration/verify.ts`

**Dependencies:** Tasks 1-3 (schema must be live, types regenerated)

- [ ] **Step 1: Write extraction script**

`extract-almyta.sh` uses `mdb-export` to dump CSV from each company `.data` file:

```bash
ALMYTA_BASE="/Users/mkgbuilds/Library/CloudStorage/OneDrive-MDMContracting/MG Work/03_IT_Technology/Almyta-Postgres/AlmytaSystems"

for company in "#MDM Telecom Inc.#" "#MDM Wood Industries#" "#MDM Contracting Inc.#"; do
  for table in Parts Categories Vendor UOM PO POLines MatIn MatOut PartsActive VendorCatalog BOM BOMreports Customer; do
    mdb-export "$ALMYTA_BASE/$company/acsd312.data" "$table" > "exports/${company}_${table}.csv" 2>/dev/null
  done
done
```

- [ ] **Step 2: Write transform script**

`transform.ts` — reads CSVs, maps to KrewPact schema:

- `Parts.PartNo` → `almyta_part_no`, `Parts.ShortID` → `sku` + `almyta_short_id`
- `Parts.Description` → `name`
- `Parts.UOM` → map Almyta UOM ID to `inventory_uom` enum
- `Parts.Category` → lookup from Categories CSV
- `Parts.UseSerial` → `tracking_type: 'serial'` if true
- `Parts.curCost` → used for initial_stock valuation_rate
- `Parts.InStock` → used for initial_stock qty_change
- Company name → division UUID mapping (hardcoded from live DB)
- Generate UUIDs for all records
- Output: JSON files ready for Supabase insert

- [ ] **Step 3: Write load script**

`load.ts` — reads transformed JSON, inserts into Supabase in FK dependency order. Uses `createServiceClient()` (bypasses RLS). Batch inserts (1000 rows at a time). Wrapped in error handling with rollback.

- [ ] **Step 4: Write verification script**

`verify.ts` — compares:

- Row counts: Almyta Parts count vs inventory_items count per division
- Stock totals: SUM of initial_stock ledger entries vs SUM of Parts.InStock × Parts.curCost
- Serial counts: PartsActive count vs inventory_serials count
- Vendor count: Almyta Vendor count vs new portal_accounts with actor_type = 'trade_partner'

- [ ] **Step 5: Commit**

```bash
git add scripts/inventory-migration/
git commit -m "feat(inventory): Almyta data migration scripts (extract, transform, load, verify)"
```

---

## Task 18: Full Test Suite Pass and Build Verification

**Dependencies:** All previous tasks

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

All existing tests (4,029+) plus new inventory tests must pass.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

0 errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

0 errors.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Must succeed.

- [ ] **Step 5: Commit any fixes**

If any failures, fix and commit.

---

## Execution Order Summary

```
Task 1  → Schema (enums + tables)
Task 2  → RLS + triggers
Task 3  → Types + feature flag
Task 4  → Validators
Task 5  → Ledger + stock logic         ┐
Task 6  → Items/locations/fleet logic   ├── Can run in parallel
Task 7  → PO + GR logic                ┘ (after 3-4)
Task 8  → Serial tracking
Task 9  → API routes (items, locations, fleet, stock)
Task 10 → API routes (POs, receiving, transactions, serials)
Task 11 → React hooks
Task 12 → UI: items + stock overview    ┐
Task 13 → UI: POs + receiving           ├── Can run in parallel
Task 14 → UI: fleet + serials           ┘ (after 11)
Task 15 → RLS integration tests (can run anytime after Task 2)
Task 16 → ERPNext sync (after Task 7)
Task 17 → Migration script (after Task 3)
Task 18 → Full verification
```

Tasks 5-7 are parallelizable. Tasks 12-14 are parallelizable. Task 15, 16, 17 are independent of each other and can run anytime after their listed dependencies.

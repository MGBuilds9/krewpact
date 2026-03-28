# KrewPact Inventory System — Design Spec

**Date:** 2026-03-20
**Status:** Approved (pending implementation plan)
**Author:** KrewPact Team
**Replaces:** Almyta Control System (Access-based, per-division databases)

---

## Overview

Build a production-grade inventory management system in KrewPact that replaces Almyta as the source of truth for materials and equipment tracking across all MDM Group divisions. Uses an append-only double-entry ledger for trustworthy audit trails and real-time job costing.

## Architecture Decision

**Inventory authority shift:** KrewPact/Supabase is now the inventory source-of-truth (replacing Almyta), not ERPNext. ERPNext receives cost journal entries and PO snapshots for financial reporting. This overrides the Master Plan statement "ERPNext is finance/procurement/inventory source-of-truth" — ERPNext retains finance/procurement authority, but inventory operations move to KrewPact.

**Rationale:**

- Almyta was already standalone (never synced to ERPNext)
- ERPNext's Stock module is manufacturing-oriented; construction inventory is operationally simpler
- KrewPact has the project/job context needed for material cost tracking
- Avoids round-trip latency through Cloudflare Tunnel for every stock operation

## Data Source Analysis

### Almyta Data (from `.data` Access files on MDM-Server)

| Company         | Parts (Items) | Vendors  | POs      | Receives | Issues |
| --------------- | ------------- | -------- | -------- | -------- | ------ |
| MDM Telecom     | 123,853       | 40       | 14       | 140      | 4      |
| MDM Wood        | 227,241       | 109      | 102      | —        | —      |
| MDM Contracting | 22,911        | 97       | 59       | —        | —      |
| **Total**       | **~374,000**  | **~246** | **~175** | —        | —      |

Source files: `\\MDM-SERVER\Public\AlmytaSystems\#<Company>#\acsd312.data`
Format: Microsoft Access databases (read via `mdbtools`)

### Key Almyta Tables → KrewPact Mapping

| Almyta Table         | Purpose                                                           | KrewPact Target                                    |
| -------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| `Parts`              | Items master (SKU, description, cost, UOM, serial flags, reorder) | `inventory_items`                                  |
| `Categories`         | Item categories                                                   | `inventory_item_categories`                        |
| `Vendor`             | Suppliers                                                         | `portal_accounts` (actor_type = 'trade_partner')   |
| `UOM`                | Units of measure                                                  | `inventory_uom` enum/table                         |
| `PO` + `POLines`     | Purchase orders                                                   | `inventory_purchase_orders` + `inventory_po_lines` |
| `MatIn`              | Material receipts                                                 | `inventory_ledger` (purchase_receipt)              |
| `MatOut`             | Material issues                                                   | `inventory_ledger` (material_issue)                |
| `PartsActive`        | Active serialized stock                                           | `inventory_serials`                                |
| `Customer`           | Ship-to locations                                                 | `inventory_locations`                              |
| `VendorCatalog`      | Supplier part numbers/prices                                      | `inventory_item_suppliers`                         |
| `BOM` + `BOMreports` | Bill of materials                                                 | `inventory_bom` + `inventory_bom_lines`            |
| `Asset`              | Equipment assets                                                  | Serial-tracked `inventory_items`                   |

---

## Schema Design

### Conventions (matching live DB)

All inventory tables follow the established KrewPact pattern:

```sql
CREATE TABLE inventory_<name> (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  -- ... table-specific columns ...
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger (same pattern as all other tables)
CREATE TRIGGER trg_inventory_<name>_updated_at
  BEFORE UPDATE ON inventory_<name>
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

RLS policies use existing helper functions:

- `krewpact_divisions()` — division scoping
- `krewpact_org_id()` — org scoping
- `krewpact_user_id()` — user identification
- `is_platform_admin()` — admin override

### New Enums

```sql
CREATE TYPE inventory_tracking_type AS ENUM ('none', 'serial', 'lot');
CREATE TYPE inventory_valuation_method AS ENUM ('weighted_average', 'specific_identification');
CREATE TYPE inventory_uom AS ENUM (
  'each', 'meter', 'foot', 'spool', 'box', 'kg', 'lb', 'liter', 'pack', 'roll', 'sheet', 'pair'
);
CREATE TYPE inventory_location_type AS ENUM ('warehouse', 'job_site', 'vehicle');
CREATE TYPE inventory_transaction_type AS ENUM (
  'purchase_receipt', 'purchase_return',
  'material_issue', 'material_return',
  'stock_transfer', 'stock_adjustment',
  'scrap', 'tool_checkout', 'tool_return',
  'initial_stock'
);
CREATE TYPE inventory_po_status AS ENUM (
  'draft', 'submitted', 'approved',
  'partially_received', 'fully_received', 'closed', 'cancelled'
);
CREATE TYPE inventory_gr_status AS ENUM ('draft', 'confirmed');
CREATE TYPE serial_status AS ENUM (
  'in_stock', 'checked_out', 'in_transit', 'maintenance',
  'quarantine', 'decommissioned'
);
CREATE TYPE fleet_vehicle_type AS ENUM ('truck', 'van', 'trailer', 'heavy_equipment', 'other');
CREATE TYPE fleet_vehicle_status AS ENUM ('active', 'maintenance', 'decommissioned');
CREATE TYPE fleet_ownership_type AS ENUM ('owned', 'leased', 'rented');
```

### Table 1: Item Categories

```sql
CREATE TABLE inventory_item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES inventory_item_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 2: Items Master

```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES inventory_item_categories(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_of_measure inventory_uom NOT NULL DEFAULT 'each',
  secondary_uom inventory_uom,
  secondary_uom_conversion NUMERIC(14,4),
  tracking_type inventory_tracking_type NOT NULL DEFAULT 'none',
  valuation_method inventory_valuation_method NOT NULL DEFAULT 'weighted_average',
  manufacturer TEXT,
  model_number TEXT,
  part_number_manufacturer TEXT,
  current_revision TEXT,
  barcode TEXT,
  weight_net NUMERIC(10,3),
  weight_gross NUMERIC(10,3),
  weight_uom TEXT DEFAULT 'kg',
  min_stock_level NUMERIC(14,2),
  max_stock_level NUMERIC(14,2),
  reorder_qty NUMERIC(14,2),
  default_supplier_id UUID REFERENCES portal_accounts(id) ON DELETE SET NULL,
  cost_catalog_item_id UUID REFERENCES cost_catalog_items(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  almyta_part_no INTEGER,
  almyta_short_id TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(division_id, sku)
);
```

### Table 3: Item-Supplier Mapping

```sql
CREATE TABLE inventory_item_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  supplier_part_number TEXT,
  supplier_price NUMERIC(14,4),
  lead_days INTEGER,
  pack_size INTEGER,
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, supplier_id)
);
```

### Table 4: Fleet Vehicles

```sql
CREATE TABLE fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  unit_number TEXT NOT NULL,
  vin TEXT UNIQUE,
  year INTEGER,
  make TEXT,
  model TEXT,
  license_plate TEXT,
  vehicle_type fleet_vehicle_type NOT NULL DEFAULT 'truck',
  status fleet_vehicle_status NOT NULL DEFAULT 'active',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  insurance_expiry DATE,
  ownership_type fleet_ownership_type NOT NULL DEFAULT 'owned',
  acquisition_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(division_id, unit_number)
);
```

### Table 5: Locations

```sql
CREATE TABLE inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  location_type inventory_location_type NOT NULL,
  address TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  parent_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  linked_vehicle_id UUID REFERENCES fleet_vehicles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_job_site_needs_project CHECK (
    location_type != 'job_site' OR project_id IS NOT NULL
  ),
  CONSTRAINT chk_vehicle_needs_fleet CHECK (
    location_type != 'vehicle' OR linked_vehicle_id IS NOT NULL
  )
);

CREATE TABLE inventory_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(location_id, name)
);
```

### Table 6: Inventory Ledger (append-only, double-entry)

```sql
CREATE TABLE inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  transaction_type inventory_transaction_type NOT NULL,
  qty_change NUMERIC(14,4) NOT NULL CHECK (qty_change != 0),
  valuation_rate NUMERIC(14,4) NOT NULL DEFAULT 0,
  value_change NUMERIC(14,2) NOT NULL DEFAULT 0,
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  spot_id UUID REFERENCES inventory_spots(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  serial_id UUID REFERENCES inventory_serials(id) ON DELETE SET NULL,
  lot_number TEXT,
  counterpart_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  reference_type TEXT,
  reference_id UUID,
  reason_code TEXT,
  notes TEXT,
  transacted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  transacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_issue_needs_project CHECK (
    transaction_type NOT IN ('material_issue', 'material_return') OR project_id IS NOT NULL
  ),
  CONSTRAINT chk_adjustment_needs_reason CHECK (
    transaction_type NOT IN ('stock_adjustment', 'scrap') OR reason_code IS NOT NULL
  )
);

-- CRITICAL: No updates or deletes on the ledger
CREATE RULE inventory_ledger_no_update AS ON UPDATE TO inventory_ledger DO INSTEAD NOTHING;
CREATE RULE inventory_ledger_no_delete AS ON DELETE TO inventory_ledger DO INSTEAD NOTHING;

-- Materialized view for fast stock queries
CREATE MATERIALIZED VIEW inventory_stock_summary AS
SELECT
  item_id,
  location_id,
  spot_id,
  SUM(qty_change) AS qty_on_hand,
  SUM(value_change) AS total_value,
  MAX(transacted_at) AS last_transaction_at
FROM inventory_ledger
GROUP BY item_id, location_id, spot_id;

CREATE UNIQUE INDEX idx_stock_summary_pk ON inventory_stock_summary(item_id, location_id, COALESCE(spot_id, '00000000-0000-0000-0000-000000000000'));
```

### Table 7: Serial Tracking

```sql
CREATE TABLE inventory_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  serial_number TEXT NOT NULL,
  secondary_serial TEXT,
  status serial_status NOT NULL DEFAULT 'in_stock',
  current_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  current_spot_id UUID REFERENCES inventory_spots(id) ON DELETE SET NULL,
  checked_out_to UUID REFERENCES users(id) ON DELETE SET NULL,
  purchase_date DATE,
  warranty_expiry DATE,
  acquisition_cost NUMERIC(14,2),
  condition_notes TEXT,
  almyta_rec_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, serial_number)
);
```

### Table 8: Lot Tracking

```sql
CREATE TABLE inventory_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  lot_number TEXT NOT NULL,
  manufacture_date DATE,
  expiry_date DATE,
  initial_qty NUMERIC(14,4),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, lot_number)
);
```

### Table 9: Purchase Orders

```sql
CREATE TABLE inventory_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES portal_accounts(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status inventory_po_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  delivery_location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  rfq_bid_id UUID REFERENCES rfq_bids(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_po_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  qty_ordered NUMERIC(14,4) NOT NULL,
  qty_received NUMERIC(14,4) NOT NULL DEFAULT 0,
  unit_price NUMERIC(14,4) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL,
  supplier_part_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 10: Goods Receipts

```sql
CREATE TABLE inventory_goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  gr_number TEXT UNIQUE NOT NULL,
  po_id UUID NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE RESTRICT,
  status inventory_gr_status NOT NULL DEFAULT 'draft',
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE RESTRICT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_gr_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id UUID NOT NULL REFERENCES inventory_goods_receipts(id) ON DELETE CASCADE,
  po_line_id UUID NOT NULL REFERENCES inventory_po_lines(id) ON DELETE RESTRICT,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  qty_received NUMERIC(14,4) NOT NULL,
  unit_price NUMERIC(14,4) NOT NULL,
  spot_id UUID REFERENCES inventory_spots(id) ON DELETE SET NULL,
  serial_number TEXT,
  lot_number TEXT,
  condition_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 11: Bill of Materials

```sql
CREATE TABLE inventory_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT default_org_id(),
  division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  assembly_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  revision TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES inventory_bom(id) ON DELETE CASCADE,
  component_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,4) NOT NULL,
  labor_hours NUMERIC(10,2),
  labor_cost NUMERIC(14,2),
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
```

---

## Integration Points (Verified Against Live DB)

### FK References (all verified 2026-03-20)

| Our Table             | FK Column              | Target                   | Target Type | Nullable                             |
| --------------------- | ---------------------- | ------------------------ | ----------- | ------------------------------------ |
| All inventory tables  | `org_id`               | `organizations(id)`      | UUID        | NOT NULL, DEFAULT `default_org_id()` |
| All inventory tables  | `division_id`          | `divisions(id)`          | UUID        | NOT NULL                             |
| Items, POs, locations | `created_by`           | `users(id)`              | UUID        | NULL, ON DELETE SET NULL             |
| Items                 | `default_supplier_id`  | `portal_accounts(id)`    | UUID        | NULL                                 |
| Items                 | `cost_catalog_item_id` | `cost_catalog_items(id)` | UUID        | NULL                                 |
| Locations             | `project_id`           | `projects(id)`           | UUID        | NULL (NOT NULL for job_site)         |
| Locations             | `linked_vehicle_id`    | `fleet_vehicles(id)`     | UUID        | NULL (NOT NULL for vehicle)          |
| POs                   | `supplier_id`          | `portal_accounts(id)`    | UUID        | NOT NULL                             |
| POs                   | `rfq_bid_id`           | `rfq_bids(id)`           | UUID        | NULL                                 |
| Ledger                | `project_id`           | `projects(id)`           | UUID        | NULL (NOT NULL for issue/return)     |
| Ledger                | `transacted_by`        | `users(id)`              | UUID        | NOT NULL                             |

### RLS Policy Pattern

```sql
-- SELECT: division-scoped + platform admin override
CREATE POLICY inventory_<table>_select ON inventory_<table>
  FOR SELECT USING (
    (org_id::text = krewpact_org_id())
    AND (
      division_id::text IN (SELECT jsonb_array_elements_text(krewpact_divisions()))
      OR is_platform_admin()
    )
  );

-- INSERT/UPDATE: same division scope
-- DELETE: platform_admin only (or blocked entirely for ledger)
```

### ERPNext Sync

| KrewPact Entity             | ERPNext Doctype  | Sync Trigger | Direction |
| --------------------------- | ---------------- | ------------ | --------- |
| `inventory_purchase_orders` | Purchase Order   | PO approved  | Outbound  |
| `inventory_goods_receipts`  | Purchase Receipt | GR confirmed | Outbound  |
| Material cost summary       | Journal Entry    | Daily cron   | Outbound  |

Uses existing `erp_sync_map` (entity_type: `inventory_po`, `inventory_gr`, `inventory_cost_journal`) + `erp_sync_jobs` → `erp_sync_events` pipeline.

### Job Cost Integration

Material costs feed into the existing `job_cost_snapshots` table:

```sql
-- Real-time material cost for a project
SELECT SUM(ABS(value_change))
FROM inventory_ledger
WHERE project_id = ?
AND transaction_type IN ('material_issue', 'material_return');

-- Combined with labor (time_entries) and expenses (expense_claims)
-- for unified job cost view
```

### Project Lifecycle Coupling

- `inventory_locations` of type `job_site` reference `projects(id)` — lifecycle follows project
- Material issue to a job site auto-tags `project_id` from the location
- Cannot issue to projects with `status IN ('closed', 'cancelled')` (check constraint on ledger)
- Project completion flags remaining inventory at job site for return/transfer

---

## Migration Strategy

### Source

Per-company Access databases at `\\MDM-SERVER\Public\AlmytaSystems\#<Company>#\acsd312.data`
Readable via `mdbtools` (`mdb-export` to CSV).

### Extraction

```bash
# For each company:
mdb-export "<company>/acsd312.data" Parts > parts.csv
mdb-export "<company>/acsd312.data" Vendor > vendors.csv
mdb-export "<company>/acsd312.data" PO > pos.csv
mdb-export "<company>/acsd312.data" POLines > po_lines.csv
mdb-export "<company>/acsd312.data" MatIn > receipts.csv
mdb-export "<company>/acsd312.data" MatOut > issues.csv
mdb-export "<company>/acsd312.data" Categories > categories.csv
mdb-export "<company>/acsd312.data" UOM > uom.csv
mdb-export "<company>/acsd312.data" VendorCatalog > vendor_catalog.csv
mdb-export "<company>/acsd312.data" PartsActive > serials.csv
mdb-export "<company>/acsd312.data" BOM > bom.csv
mdb-export "<company>/acsd312.data" BOMreports > bom_lines.csv
```

### Division Mapping

| Almyta Company       | Division Code | Division UUID                          |
| -------------------- | ------------- | -------------------------------------- |
| MDM Telecom Inc.     | `telecom`     | `f620691b-c153-4427-b8c4-9d36ece8eac9` |
| MDM Wood Industries  | `wood`        | `90fd5f6b-9ff5-4adf-981e-11c762c9cb69` |
| MDM Contracting Inc. | `contracting` | `be7931f8-bd30-4307-955d-1a10c59f5860` |

### Load Order (respects FK dependencies)

1. `inventory_item_categories` ← from Categories
2. `inventory_items` ← from Parts (374K items across 3 divisions)
3. `portal_accounts` (upsert) ← from Vendor (merge with existing trade partners)
4. `inventory_item_suppliers` ← from VendorCatalog
5. `inventory_locations` ← from warehouse IDs + known sites
6. `inventory_spots` ← from spot values per warehouse
7. `inventory_serials` ← from PartsActive where serial-tracked
8. `inventory_lots` ← from PartsActive where lot-tracked
9. `inventory_ledger` (initial_stock) ← from Parts.InStock × Parts.curCost
10. `inventory_purchase_orders` + lines ← from PO + POLines (historical, status: closed)
11. `inventory_bom` + lines ← from BOM + BOMreports

### Migration Traceability

- `inventory_items.almyta_part_no` → Almyta `Parts.PartNo`
- `inventory_items.almyta_short_id` → Almyta `Parts.ShortID`
- `inventory_serials.almyta_rec_id` → Almyta component record ID
- All migration data tagged with `transaction_type: 'initial_stock'` in ledger
- Use existing `migration_batches` / `migration_records` tables for tracking
- Drop `almyta_*` columns after cutover verification

### Cutover Plan

1. Freeze Almyta (read-only)
2. Run migration script
3. Verify: row counts, stock totals, serial assignments match
4. Enable inventory feature flag in KrewPact
5. UAT with Telecom team (primary users)
6. Decommission Almyta Access frontend
7. Keep Postgres VM as archive for 6 months

---

## Feature Gating

```typescript
// lib/feature-flags.ts
inventory_management: false,  // Enable after migration + UAT
```

Navigation, pages, and API routes gated behind this flag per existing KrewPact pattern.

---

## What This Does NOT Include (Future)

- Full fleet management (maintenance, fuel, mileage, GPS)
- Job-to-job direct transfer (material_issue between projects)
- Three-way invoice matching (PO vs GR vs supplier invoice)
- Barcode scanning mobile interface
- Cycle count / physical inventory workflows
- Demand forecasting / automated reorder
- Cross-division transfer workflows

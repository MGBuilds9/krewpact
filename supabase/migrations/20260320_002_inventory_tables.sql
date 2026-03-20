-- ===========================
-- INVENTORY SYSTEM — TABLES
-- ===========================
-- FK dependency order: fleet_vehicles → categories → items → item_suppliers
-- → locations → spots → serials → lots → ledger
-- → purchase_orders → po_lines → goods_receipts → gr_lines
-- → bom → bom_lines

-- 1. Fleet Vehicles
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

-- 2. Item Categories
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

-- 3. Items Master
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

-- 4. Item-Supplier Mapping (child table — no org_id/division_id)
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

-- 5. Locations
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

-- 6. Spots (child table — no org_id/division_id)
CREATE TABLE inventory_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(location_id, name)
);

-- 7. Serial Tracking
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

-- 8. Lot Tracking (immutable after creation — no updated_at)
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

-- 9. Inventory Ledger (append-only, double-entry)
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

-- Ledger immutability — no updates or deletes allowed
CREATE RULE inventory_ledger_no_update AS ON UPDATE TO inventory_ledger DO INSTEAD NOTHING;
CREATE RULE inventory_ledger_no_delete AS ON DELETE TO inventory_ledger DO INSTEAD NOTHING;

-- Ledger performance indexes
CREATE INDEX idx_ledger_item_location ON inventory_ledger(item_id, location_id);
CREATE INDEX idx_ledger_project ON inventory_ledger(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_ledger_transacted_at ON inventory_ledger(transacted_at);
CREATE INDEX idx_ledger_serial ON inventory_ledger(serial_id) WHERE serial_id IS NOT NULL;
CREATE INDEX idx_ledger_division ON inventory_ledger(division_id, transacted_at);

-- 10. Purchase Orders
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

-- 11. PO Lines (child table — no org_id/division_id)
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

-- 12. Goods Receipts
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

-- 13. GR Lines (child table — no org_id/division_id)
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

-- 14. Bill of Materials
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

-- 15. BOM Lines (child table — no org_id/division_id)
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

-- Materialized View: Stock Summary
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

CREATE UNIQUE INDEX idx_stock_summary_pk
  ON inventory_stock_summary(item_id, location_id, COALESCE(spot_id, '00000000-0000-0000-0000-000000000000'::uuid));

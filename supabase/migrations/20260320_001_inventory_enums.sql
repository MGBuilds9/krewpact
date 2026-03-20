-- ===========================
-- INVENTORY SYSTEM — ENUMS
-- ===========================

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

import { z } from 'zod';

import { optionalSafeString, safeString } from '@/lib/sanitize';

// ============================================================
// Shared enums
// ============================================================

export const unitOfMeasureValues = [
  'each',
  'meter',
  'foot',
  'spool',
  'box',
  'kg',
  'lb',
  'liter',
  'pack',
  'roll',
  'sheet',
  'pair',
] as const;

export const trackingTypeValues = ['none', 'serial', 'lot'] as const;

export const valuationMethodValues = ['weighted_average', 'specific_identification'] as const;

export const locationTypeValues = ['warehouse', 'job_site', 'vehicle'] as const;

export const vehicleTypeValues = ['truck', 'van', 'trailer', 'heavy_equipment', 'other'] as const;

export const vehicleStatusValues = ['active', 'maintenance', 'decommissioned'] as const;

export const ownershipTypeValues = ['owned', 'leased', 'rented'] as const;

// ============================================================
// createItemSchema
// ============================================================

export const createItemSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: safeString().pipe(z.string().min(1).max(200)),
  division_id: z.string().uuid(),
  unit_of_measure: z.enum(unitOfMeasureValues),
  description: optionalSafeString(),
  category_id: z.string().uuid().optional(),
  tracking_type: z.enum(trackingTypeValues).default('none'),
  valuation_method: z.enum(valuationMethodValues).default('weighted_average'),
  manufacturer: optionalSafeString(),
  model_number: optionalSafeString(),
  part_number_manufacturer: optionalSafeString(),
  barcode: optionalSafeString(),
  weight_net: z.number().min(0).optional(),
  weight_gross: z.number().min(0).optional(),
  weight_uom: z.string().default('kg'),
  min_stock_level: z.number().min(0).optional(),
  max_stock_level: z.number().min(0).optional(),
  reorder_qty: z.number().min(0).optional(),
  default_supplier_id: z.string().uuid().optional(),
  cost_catalog_item_id: z.string().uuid().optional(),
  secondary_uom: z.enum(unitOfMeasureValues).optional(),
  secondary_uom_conversion: z.number().gt(0).optional(),
});

export const updateItemSchema = createItemSchema.partial();

// ============================================================
// createLocationSchema
// ============================================================

export const createLocationSchema = z
  .object({
    name: safeString().pipe(z.string().min(1).max(200)),
    division_id: z.string().uuid(),
    location_type: z.enum(locationTypeValues),
    address: optionalSafeString(),
    project_id: z.string().uuid().optional(),
    parent_location_id: z.string().uuid().optional(),
    linked_vehicle_id: z.string().uuid().optional(),
  })
  .refine((data) => data.location_type !== 'job_site' || data.project_id !== undefined, {
    message: 'project_id is required when location_type is job_site',
    path: ['project_id'],
  })
  .refine((data) => data.location_type !== 'vehicle' || data.linked_vehicle_id !== undefined, {
    message: 'linked_vehicle_id is required when location_type is vehicle',
    path: ['linked_vehicle_id'],
  });

// ============================================================
// createFleetVehicleSchema
// ============================================================

export const createFleetVehicleSchema = z.object({
  unit_number: safeString().pipe(z.string().min(1).max(50)),
  division_id: z.string().uuid(),
  vehicle_type: z.enum(vehicleTypeValues),
  vin: optionalSafeString(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: optionalSafeString(),
  model: optionalSafeString(),
  license_plate: optionalSafeString(),
  status: z.enum(vehicleStatusValues).default('active'),
  assigned_to: z.string().uuid().optional(),
  insurance_expiry: z.string().optional(),
  ownership_type: z.enum(ownershipTypeValues).default('owned'),
  acquisition_date: z.string().optional(),
  notes: optionalSafeString(),
});

// ============================================================
// createSpotSchema
// ============================================================

export const createSpotSchema = z.object({
  location_id: z.string().uuid(),
  name: safeString().pipe(z.string().min(1).max(100)),
  sort_order: z.number().int().min(0).optional(),
});

// ============================================================
// createSerialSchema
// ============================================================

export const createSerialSchema = z.object({
  item_id: z.string().uuid(),
  division_id: z.string().uuid(),
  serial_number: safeString().pipe(z.string().min(1).max(100)),
  secondary_serial: optionalSafeString(),
  current_location_id: z.string().uuid().optional(),
  current_spot_id: z.string().uuid().optional(),
  purchase_date: z.string().optional(),
  warranty_expiry: z.string().optional(),
  acquisition_cost: z.number().min(0).optional(),
  condition_notes: optionalSafeString(),
});

// ============================================================
// createBomSchema + bomLineSchema
// ============================================================

export const bomLineSchema = z.object({
  component_item_id: z.string().uuid(),
  quantity: z.number().gt(0),
  labor_hours: z.number().min(0).optional(),
  labor_cost: z.number().min(0).optional(),
  is_critical: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  notes: optionalSafeString(),
});

export const createBomSchema = z.object({
  assembly_item_id: z.string().uuid(),
  division_id: z.string().uuid(),
  revision: optionalSafeString(),
  lines: z.array(bomLineSchema).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type CreateItem = z.infer<typeof createItemSchema>;
export type UpdateItem = z.infer<typeof updateItemSchema>;
export type CreateLocation = z.infer<typeof createLocationSchema>;
export type CreateFleetVehicle = z.infer<typeof createFleetVehicleSchema>;
export type CreateSpot = z.infer<typeof createSpotSchema>;
export type CreateSerial = z.infer<typeof createSerialSchema>;
export type BomLine = z.infer<typeof bomLineSchema>;
export type CreateBom = z.infer<typeof createBomSchema>;

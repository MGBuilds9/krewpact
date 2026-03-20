import { describe, expect, it } from 'vitest';

import {
  bomLineSchema,
  createBomSchema,
  createFleetVehicleSchema,
  createItemSchema,
  createLocationSchema,
  createSerialSchema,
  createSpotSchema,
  updateItemSchema,
} from '@/lib/validators/inventory';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = 'b1ffc200-ad1c-4f09-8c7e-7cc0ce491b22';

// ============================================================
// createItemSchema
// ============================================================
describe('createItemSchema', () => {
  const validItem = {
    sku: 'CAB-100',
    name: 'Copper Cable 100m',
    division_id: VALID_UUID,
    unit_of_measure: 'meter',
  };

  it('accepts valid complete input', () => {
    const result = createItemSchema.safeParse({
      ...validItem,
      description: 'High-grade copper cable',
      category_id: VALID_UUID_2,
      tracking_type: 'serial',
      valuation_method: 'specific_identification',
      manufacturer: 'Belden',
      model_number: 'BX-100',
      part_number_manufacturer: 'BLD-BX100',
      barcode: '1234567890123',
      weight_net: 5.5,
      weight_gross: 6.0,
      weight_uom: 'lb',
      min_stock_level: 10,
      max_stock_level: 100,
      reorder_qty: 25,
      default_supplier_id: VALID_UUID_2,
      cost_catalog_item_id: VALID_UUID_2,
      secondary_uom: 'foot',
      secondary_uom_conversion: 3.28084,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid minimal input (required fields only)', () => {
    const result = createItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('fails when sku is missing', () => {
    const { sku: _sku, ...rest } = validItem;
    const result = createItemSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when name is missing', () => {
    const { name: _name, ...rest } = validItem;
    const result = createItemSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when division_id is not a valid UUID', () => {
    const result = createItemSchema.safeParse({ ...validItem, division_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('fails on invalid unit_of_measure enum', () => {
    const result = createItemSchema.safeParse({ ...validItem, unit_of_measure: 'gallon' });
    expect(result.success).toBe(false);
  });

  it('fails when sku exceeds 50 characters', () => {
    const result = createItemSchema.safeParse({ ...validItem, sku: 'X'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('fails when name exceeds 200 characters', () => {
    const result = createItemSchema.safeParse({ ...validItem, name: 'X'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('fails when weight_net is negative', () => {
    const result = createItemSchema.safeParse({ ...validItem, weight_net: -1 });
    expect(result.success).toBe(false);
  });

  it('fails when secondary_uom_conversion is zero', () => {
    const result = createItemSchema.safeParse({
      ...validItem,
      secondary_uom: 'foot',
      secondary_uom_conversion: 0,
    });
    expect(result.success).toBe(false);
  });

  it('defaults tracking_type to none', () => {
    const result = createItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tracking_type).toBe('none');
    }
  });

  it('defaults valuation_method to weighted_average', () => {
    const result = createItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valuation_method).toBe('weighted_average');
    }
  });
});

// ============================================================
// updateItemSchema
// ============================================================
describe('updateItemSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updateItemSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with valid fields', () => {
    const result = updateItemSchema.safeParse({ name: 'Updated Name', weight_net: 10 });
    expect(result.success).toBe(true);
  });

  it('fails on invalid enum value', () => {
    const result = updateItemSchema.safeParse({ unit_of_measure: 'bushel' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createLocationSchema
// ============================================================
describe('createLocationSchema', () => {
  const validWarehouse = {
    name: 'Main Warehouse',
    division_id: VALID_UUID,
    location_type: 'warehouse',
  };

  it('accepts valid warehouse (minimal input)', () => {
    const result = createLocationSchema.safeParse(validWarehouse);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = createLocationSchema.safeParse({
      ...validWarehouse,
      address: '123 Industrial Rd',
      parent_location_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('fails when name is missing', () => {
    const result = createLocationSchema.safeParse({
      division_id: VALID_UUID,
      location_type: 'warehouse',
    });
    expect(result.success).toBe(false);
  });

  it('fails on invalid location_type enum', () => {
    const result = createLocationSchema.safeParse({
      ...validWarehouse,
      location_type: 'office',
    });
    expect(result.success).toBe(false);
  });

  it('fails when job_site has no project_id', () => {
    const result = createLocationSchema.safeParse({
      name: 'Site A',
      division_id: VALID_UUID,
      location_type: 'job_site',
    });
    expect(result.success).toBe(false);
  });

  it('accepts job_site with project_id', () => {
    const result = createLocationSchema.safeParse({
      name: 'Site A',
      division_id: VALID_UUID,
      location_type: 'job_site',
      project_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('fails when vehicle has no linked_vehicle_id', () => {
    const result = createLocationSchema.safeParse({
      name: 'Truck 01',
      division_id: VALID_UUID,
      location_type: 'vehicle',
    });
    expect(result.success).toBe(false);
  });

  it('accepts vehicle with linked_vehicle_id', () => {
    const result = createLocationSchema.safeParse({
      name: 'Truck 01',
      division_id: VALID_UUID,
      location_type: 'vehicle',
      linked_vehicle_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// createFleetVehicleSchema
// ============================================================
describe('createFleetVehicleSchema', () => {
  const validVehicle = {
    unit_number: 'TRK-001',
    division_id: VALID_UUID,
    vehicle_type: 'truck',
  };

  it('accepts valid minimal input', () => {
    const result = createFleetVehicleSchema.safeParse(validVehicle);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = createFleetVehicleSchema.safeParse({
      ...validVehicle,
      vin: '1HGBH41JXMN109186',
      year: 2024,
      make: 'Ford',
      model: 'F-350',
      license_plate: 'ABC 1234',
      status: 'maintenance',
      assigned_to: VALID_UUID_2,
      insurance_expiry: '2027-06-15',
      ownership_type: 'leased',
      acquisition_date: '2024-01-15',
      notes: 'Fleet unit for telecom division',
    });
    expect(result.success).toBe(true);
  });

  it('fails when unit_number is missing', () => {
    const result = createFleetVehicleSchema.safeParse({
      division_id: VALID_UUID,
      vehicle_type: 'truck',
    });
    expect(result.success).toBe(false);
  });

  it('fails on invalid vehicle_type enum', () => {
    const result = createFleetVehicleSchema.safeParse({
      ...validVehicle,
      vehicle_type: 'bicycle',
    });
    expect(result.success).toBe(false);
  });

  it('fails when year is out of range', () => {
    const result = createFleetVehicleSchema.safeParse({
      ...validVehicle,
      year: 1800,
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to active', () => {
    const result = createFleetVehicleSchema.safeParse(validVehicle);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  it('defaults ownership_type to owned', () => {
    const result = createFleetVehicleSchema.safeParse(validVehicle);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ownership_type).toBe('owned');
    }
  });
});

// ============================================================
// createSpotSchema
// ============================================================
describe('createSpotSchema', () => {
  it('accepts valid input', () => {
    const result = createSpotSchema.safeParse({
      location_id: VALID_UUID,
      name: 'Shelf A-1',
    });
    expect(result.success).toBe(true);
  });

  it('fails when location_id is missing', () => {
    const result = createSpotSchema.safeParse({ name: 'Shelf A-1' });
    expect(result.success).toBe(false);
  });

  it('fails when name exceeds 100 characters', () => {
    const result = createSpotSchema.safeParse({
      location_id: VALID_UUID,
      name: 'X'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional sort_order', () => {
    const result = createSpotSchema.safeParse({
      location_id: VALID_UUID,
      name: 'Shelf B-2',
      sort_order: 5,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// createSerialSchema
// ============================================================
describe('createSerialSchema', () => {
  const validSerial = {
    item_id: VALID_UUID,
    division_id: VALID_UUID_2,
    serial_number: 'SN-2026-00001',
  };

  it('accepts valid minimal input', () => {
    const result = createSerialSchema.safeParse(validSerial);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = createSerialSchema.safeParse({
      ...validSerial,
      secondary_serial: 'MFR-SN-001',
      current_location_id: VALID_UUID,
      current_spot_id: VALID_UUID_2,
      purchase_date: '2026-01-15',
      warranty_expiry: '2028-01-15',
      acquisition_cost: 1250.0,
      condition_notes: 'New, factory sealed',
    });
    expect(result.success).toBe(true);
  });

  it('fails when serial_number is missing', () => {
    const result = createSerialSchema.safeParse({
      item_id: VALID_UUID,
      division_id: VALID_UUID_2,
    });
    expect(result.success).toBe(false);
  });

  it('fails when serial_number exceeds 100 characters', () => {
    const result = createSerialSchema.safeParse({
      ...validSerial,
      serial_number: 'S'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('fails when acquisition_cost is negative', () => {
    const result = createSerialSchema.safeParse({
      ...validSerial,
      acquisition_cost: -50,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// bomLineSchema
// ============================================================
describe('bomLineSchema', () => {
  it('accepts valid input', () => {
    const result = bomLineSchema.safeParse({
      component_item_id: VALID_UUID,
      quantity: 4,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = bomLineSchema.safeParse({
      component_item_id: VALID_UUID,
      quantity: 4,
      labor_hours: 2.5,
      labor_cost: 125.0,
      is_critical: true,
      sort_order: 1,
      notes: 'Load-bearing component',
    });
    expect(result.success).toBe(true);
  });

  it('fails when component_item_id is missing', () => {
    const result = bomLineSchema.safeParse({ quantity: 4 });
    expect(result.success).toBe(false);
  });

  it('fails when quantity is zero', () => {
    const result = bomLineSchema.safeParse({
      component_item_id: VALID_UUID,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('fails when quantity is negative', () => {
    const result = bomLineSchema.safeParse({
      component_item_id: VALID_UUID,
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createBomSchema
// ============================================================
describe('createBomSchema', () => {
  it('accepts valid minimal input', () => {
    const result = createBomSchema.safeParse({
      assembly_item_id: VALID_UUID,
      division_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with lines', () => {
    const result = createBomSchema.safeParse({
      assembly_item_id: VALID_UUID,
      division_id: VALID_UUID_2,
      revision: 'R1',
      lines: [
        { component_item_id: VALID_UUID, quantity: 4 },
        { component_item_id: VALID_UUID_2, quantity: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('fails when assembly_item_id is missing', () => {
    const result = createBomSchema.safeParse({
      division_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('fails when lines contain invalid entries', () => {
    const result = createBomSchema.safeParse({
      assembly_item_id: VALID_UUID,
      division_id: VALID_UUID_2,
      lines: [{ component_item_id: VALID_UUID, quantity: -1 }],
    });
    expect(result.success).toBe(false);
  });
});

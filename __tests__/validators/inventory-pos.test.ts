import { describe, expect, it } from 'vitest';

import {
  createGoodsReceiptSchema,
  createPurchaseOrderSchema,
  createTransactionSchema,
  grLineSchema,
  poLineSchema,
} from '@/lib/validators/inventory';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = 'b1ffc200-ad1c-4f09-8c7e-7cc0ce491b22';

// ============================================================
// poLineSchema
// ============================================================
describe('poLineSchema', () => {
  const validLine = {
    item_id: VALID_UUID,
    description: 'Copper cable 100m spool',
    qty_ordered: 10,
    unit_price: 45.99,
  };

  it('accepts valid input', () => {
    const result = poLineSchema.safeParse(validLine);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = poLineSchema.safeParse({
      ...validLine,
      supplier_part_number: 'SUP-CAB-100',
      notes: 'Urgent delivery',
    });
    expect(result.success).toBe(true);
  });

  it('fails when item_id is missing', () => {
    const { item_id: _id, ...rest } = validLine;
    const result = poLineSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when description is empty', () => {
    const result = poLineSchema.safeParse({ ...validLine, description: '' });
    expect(result.success).toBe(false);
  });

  it('fails when qty_ordered is zero', () => {
    const result = poLineSchema.safeParse({ ...validLine, qty_ordered: 0 });
    expect(result.success).toBe(false);
  });

  it('fails when unit_price is negative', () => {
    const result = poLineSchema.safeParse({ ...validLine, unit_price: -1 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createPurchaseOrderSchema
// ============================================================
describe('createPurchaseOrderSchema', () => {
  const validPO = {
    division_id: VALID_UUID,
    supplier_id: VALID_UUID_2,
    lines: [
      {
        item_id: VALID_UUID,
        description: 'Cable spool',
        qty_ordered: 5,
        unit_price: 50.0,
      },
    ],
  };

  it('accepts valid minimal input', () => {
    const result = createPurchaseOrderSchema.safeParse(validPO);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      project_id: VALID_UUID,
      expected_delivery_date: '2026-04-15',
      delivery_location_id: VALID_UUID_2,
      notes: 'Rush order for telecom project',
      rfq_bid_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('fails when lines is empty array', () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      lines: [],
    });
    expect(result.success).toBe(false);
  });

  it('fails when division_id is missing', () => {
    const { division_id: _div, ...rest } = validPO;
    const result = createPurchaseOrderSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when supplier_id is missing', () => {
    const { supplier_id: _sup, ...rest } = validPO;
    const result = createPurchaseOrderSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when lines contain invalid entries', () => {
    const result = createPurchaseOrderSchema.safeParse({
      ...validPO,
      lines: [{ item_id: VALID_UUID, qty_ordered: 0, unit_price: 10 }],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// grLineSchema
// ============================================================
describe('grLineSchema', () => {
  const validGRLine = {
    po_line_id: VALID_UUID,
    item_id: VALID_UUID_2,
    qty_received: 5,
    unit_price: 45.99,
  };

  it('accepts valid input', () => {
    const result = grLineSchema.safeParse(validGRLine);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = grLineSchema.safeParse({
      ...validGRLine,
      spot_id: VALID_UUID,
      serial_number: 'SN-001',
      lot_number: 'LOT-2026-A',
      condition_notes: 'Good condition',
    });
    expect(result.success).toBe(true);
  });

  it('fails when po_line_id is missing', () => {
    const { po_line_id: _id, ...rest } = validGRLine;
    const result = grLineSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when qty_received is zero', () => {
    const result = grLineSchema.safeParse({ ...validGRLine, qty_received: 0 });
    expect(result.success).toBe(false);
  });

  it('fails when unit_price is negative', () => {
    const result = grLineSchema.safeParse({ ...validGRLine, unit_price: -5 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createGoodsReceiptSchema
// ============================================================
describe('createGoodsReceiptSchema', () => {
  const validGR = {
    po_id: VALID_UUID,
    division_id: VALID_UUID_2,
    location_id: VALID_UUID,
    lines: [
      {
        po_line_id: VALID_UUID,
        item_id: VALID_UUID_2,
        qty_received: 3,
        unit_price: 45.99,
      },
    ],
  };

  it('accepts valid minimal input', () => {
    const result = createGoodsReceiptSchema.safeParse(validGR);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = createGoodsReceiptSchema.safeParse({
      ...validGR,
      received_date: '2026-03-20',
      notes: 'Partial delivery — rest expected next week',
    });
    expect(result.success).toBe(true);
  });

  it('fails when po_id is missing', () => {
    const { po_id: _id, ...rest } = validGR;
    const result = createGoodsReceiptSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails when lines is empty', () => {
    const result = createGoodsReceiptSchema.safeParse({
      ...validGR,
      lines: [],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// createTransactionSchema
// ============================================================
describe('createTransactionSchema', () => {
  const validTransaction = {
    item_id: VALID_UUID,
    division_id: VALID_UUID_2,
    transaction_type: 'purchase_receipt',
    qty_change: 10,
    location_id: VALID_UUID,
  };

  it('accepts valid minimal input', () => {
    const result = createTransactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
  });

  it('accepts valid complete input', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      valuation_rate: 45.99,
      spot_id: VALID_UUID_2,
      serial_id: VALID_UUID,
      lot_number: 'LOT-001',
      notes: 'Initial stock receipt',
    });
    expect(result.success).toBe(true);
  });

  it('fails when item_id is missing', () => {
    const { item_id: _id, ...rest } = validTransaction;
    const result = createTransactionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('fails on invalid transaction_type enum', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'sale',
    });
    expect(result.success).toBe(false);
  });

  it('rejects qty_change = 0', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      qty_change: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts negative qty_change (e.g. issue)', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'material_issue',
      qty_change: -5,
      project_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  // Conditional: material_issue requires project_id
  it('fails when material_issue has no project_id', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'material_issue',
      qty_change: -5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts material_issue with project_id', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'material_issue',
      qty_change: -5,
      project_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  // Conditional: material_return requires project_id
  it('fails when material_return has no project_id', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'material_return',
      qty_change: 3,
    });
    expect(result.success).toBe(false);
  });

  // Conditional: stock_transfer requires counterpart_location_id
  it('fails when stock_transfer has no counterpart_location_id', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'stock_transfer',
      qty_change: -5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts stock_transfer with counterpart_location_id', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'stock_transfer',
      qty_change: -5,
      counterpart_location_id: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  // Conditional: stock_adjustment requires reason_code
  it('fails when stock_adjustment has no reason_code', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'stock_adjustment',
      qty_change: 2,
    });
    expect(result.success).toBe(false);
  });

  it('accepts stock_adjustment with reason_code', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'stock_adjustment',
      qty_change: 2,
      reason_code: 'Physical count discrepancy',
    });
    expect(result.success).toBe(true);
  });

  // Conditional: scrap requires reason_code
  it('fails when scrap has no reason_code', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'scrap',
      qty_change: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts scrap with reason_code', () => {
    const result = createTransactionSchema.safeParse({
      ...validTransaction,
      transaction_type: 'scrap',
      qty_change: -1,
      reason_code: 'Damaged beyond repair',
    });
    expect(result.success).toBe(true);
  });
});

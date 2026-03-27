import { describe, expect, it } from 'vitest';

import { type AwardInput, type AwardLineInput, toErpProcurementPO } from '@/lib/erp/award-mapper';

function makeAward(overrides: Partial<AwardInput> = {}): AwardInput {
  return {
    id: 'award-001',
    bid_id: 'bid-001',
    rfq_id: 'rfq-001',
    project_id: 'proj-001',
    project_name: 'Main Street Renovation',
    supplier_name: 'Buildrite Supply Co.',
    erp_supplier_name: null,
    total_amount: 15000.0,
    currency_code: 'CAD',
    award_date: '2026-03-15',
    notes: 'Awarded after bid leveling.',
    ...overrides,
  };
}

function makeLines(): AwardLineInput[] {
  return [
    {
      description: 'Lumber - 2x4 SPF',
      quantity: 500,
      unit: 'pcs',
      unit_price: 8.5,
      line_total: 4250.0,
    },
    {
      description: 'Drywall Sheets',
      quantity: 200,
      unit: 'sheets',
      unit_price: 14.0,
      line_total: 2800.0,
    },
  ];
}

describe('toErpProcurementPO', () => {
  it('maps all award fields correctly', () => {
    const result = toErpProcurementPO(makeAward(), makeLines());
    expect(result.naming_series).toBe('PUR-ORD-.YYYY.-');
    expect(result.buying_price_list).toBe('Standard Buying');
    expect(result.supplier).toBe('Buildrite Supply Co.');
    expect(result.currency).toBe('CAD');
    expect(result.transaction_date).toBe('2026-03-15');
    expect(result.schedule_date).toBe('2026-03-15');
    expect(result.custom_mdm_award_id).toBe('award-001');
    expect(result.custom_mdm_bid_id).toBe('bid-001');
    expect(result.custom_mdm_rfq_id).toBe('rfq-001');
    expect(result.custom_mdm_project_id).toBe('proj-001');
    expect(result.remarks).toBe('Awarded after bid leveling.');
  });

  it('maps line items correctly', () => {
    const result = toErpProcurementPO(makeAward(), makeLines());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].item_code).toBe('Lumber - 2x4 SPF');
    expect(items[0].item_name).toBe('Lumber - 2x4 SPF');
    expect(items[0].qty).toBe(500);
    expect(items[0].rate).toBe(8.5);
    expect(items[0].amount).toBe(4250.0);
    expect(items[0].uom).toBe('pcs');
    expect(items[0].idx).toBe(1);
    expect(items[0].schedule_date).toBe('2026-03-15');
    expect(items[1].idx).toBe(2);
    expect(items[1].item_code).toBe('Drywall Sheets');
  });

  it('prefers item_code when provided over description fallback', () => {
    const result = toErpProcurementPO(makeAward(), [
      {
        item_code: 'LUM-2X4-SPF',
        description: 'Lumber - 2x4 SPF',
        quantity: 10,
        unit: 'pcs',
        unit_price: 8.5,
        line_total: 85,
      },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_code).toBe('LUM-2X4-SPF');
  });

  it('generates ITEM-N fallback when description is empty', () => {
    const result = toErpProcurementPO(makeAward(), [
      { description: '', quantity: 1, unit: null, unit_price: 0, line_total: 0 },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_code).toBe('ITEM-1');
  });

  it('sets schedule_date on items from award_date', () => {
    const result = toErpProcurementPO(makeAward({ award_date: '2026-03-15' }), makeLines());
    const items = result.items as Record<string, unknown>[];
    expect(items[0].schedule_date).toBe('2026-03-15');
  });

  it('uses today as item schedule_date when award_date is null', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = toErpProcurementPO(makeAward({ award_date: null }), makeLines());
    const items = result.items as Record<string, unknown>[];
    expect(items[0].schedule_date).toBe(today);
  });

  it('calculates net_total and grand_total from lines', () => {
    const result = toErpProcurementPO(makeAward(), makeLines());
    expect(result.net_total).toBe(7050.0);
    expect(result.grand_total).toBe(7050.0);
  });

  it('prefers erp_supplier_name over supplier_name', () => {
    const result = toErpProcurementPO(makeAward({ erp_supplier_name: 'SUPP-00042' }), makeLines());
    expect(result.supplier).toBe('SUPP-00042');
  });

  it('falls back to supplier_name when erp_supplier_name is null', () => {
    const result = toErpProcurementPO(makeAward({ erp_supplier_name: null }), makeLines());
    expect(result.supplier).toBe('Buildrite Supply Co.');
  });

  it('defaults supplier to empty when both names are null', () => {
    const result = toErpProcurementPO(
      makeAward({ erp_supplier_name: null, supplier_name: null }),
      makeLines(),
    );
    expect(result.supplier).toBe('');
  });

  it('defaults currency to CAD when null', () => {
    const result = toErpProcurementPO(makeAward({ currency_code: null }), makeLines());
    expect(result.currency).toBe('CAD');
  });

  it('uses today date when award_date is null', () => {
    const result = toErpProcurementPO(makeAward({ award_date: null }), makeLines());
    const today = new Date().toISOString().slice(0, 10);
    expect(result.transaction_date).toBe(today);
    expect(result.schedule_date).toBe(today);
  });

  it('sets custom_mdm_rfq_id to empty string when rfq_id is null', () => {
    const result = toErpProcurementPO(makeAward({ rfq_id: null }), makeLines());
    expect(result.custom_mdm_rfq_id).toBe('');
  });

  it('defaults remarks to empty string when notes is null', () => {
    const result = toErpProcurementPO(makeAward({ notes: null }), makeLines());
    expect(result.remarks).toBe('');
  });

  it('handles empty lines array', () => {
    const result = toErpProcurementPO(makeAward(), []);
    expect(result.items).toEqual([]);
    expect(result.net_total).toBe(0);
    expect(result.grand_total).toBe(0);
  });

  it('defaults uom to Nos when unit is null', () => {
    const result = toErpProcurementPO(makeAward(), [
      { description: 'Widget', quantity: 1, unit: null, unit_price: 10, line_total: 10 },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].uom).toBe('Nos');
  });
});

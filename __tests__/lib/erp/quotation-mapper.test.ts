import { describe, it, expect } from 'vitest';
import {
  toErpQuotation,
  type QuotationEstimateInput,
  type QuotationLineInput,
} from '@/lib/erp/quotation-mapper';

function makeEstimate(
  overrides: Partial<QuotationEstimateInput> = {},
): QuotationEstimateInput {
  return {
    id: 'est-001',
    estimate_number: 'EST-2026-0042',
    revision_no: 2,
    currency_code: 'CAD',
    account_id: 'acct-001',
    account_name: 'Acme Construction Ltd.',
    erp_customer_name: null,
    notes: 'Standard terms apply.',
    ...overrides,
  };
}

function makeLines(): QuotationLineInput[] {
  return [
    {
      description: 'Concrete Foundation',
      quantity: 100,
      unit_cost: 45.0,
      unit: 'm3',
      line_total: 4500.0,
    },
    {
      description: 'Rebar Installation',
      quantity: 200,
      unit_cost: 12.5,
      unit: 'kg',
      line_total: 2500.0,
    },
  ];
}

describe('toErpQuotation', () => {
  it('maps all estimate fields correctly', () => {
    const result = toErpQuotation(makeEstimate(), makeLines());
    expect(result.quotation_to).toBe('Customer');
    expect(result.party_name).toBe('Acme Construction Ltd.');
    expect(result.title).toBe('EST-2026-0042');
    expect(result.currency).toBe('CAD');
    expect(result.custom_mdm_estimate_id).toBe('est-001');
    expect(result.custom_mdm_estimate_version).toBe(2);
    expect(result.terms).toBe('Standard terms apply.');
  });

  it('maps line items correctly', () => {
    const result = toErpQuotation(makeEstimate(), makeLines());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].item_name).toBe('Concrete Foundation');
    expect(items[0].qty).toBe(100);
    expect(items[0].rate).toBe(45.0);
    expect(items[0].amount).toBe(4500.0);
    expect(items[0].uom).toBe('m3');
    expect(items[0].idx).toBe(1);
    expect(items[1].idx).toBe(2);
  });

  it('calculates net_total and grand_total from lines', () => {
    const result = toErpQuotation(makeEstimate(), makeLines());
    expect(result.net_total).toBe(7000.0);
    expect(result.grand_total).toBe(7000.0);
  });

  it('prefers erp_customer_name over account_name for party_name', () => {
    const result = toErpQuotation(
      makeEstimate({ erp_customer_name: 'CUST-00001' }),
      makeLines(),
    );
    expect(result.party_name).toBe('CUST-00001');
  });

  it('falls back to account_name when erp_customer_name is null', () => {
    const result = toErpQuotation(
      makeEstimate({ erp_customer_name: null }),
      makeLines(),
    );
    expect(result.party_name).toBe('Acme Construction Ltd.');
  });

  it('defaults party_name to empty when both names are null', () => {
    const result = toErpQuotation(
      makeEstimate({ erp_customer_name: null, account_name: null }),
      makeLines(),
    );
    expect(result.party_name).toBe('');
  });

  it('defaults currency to CAD when null', () => {
    const result = toErpQuotation(
      makeEstimate({ currency_code: null }),
      makeLines(),
    );
    expect(result.currency).toBe('CAD');
  });

  it('defaults revision to 1 when null', () => {
    const result = toErpQuotation(
      makeEstimate({ revision_no: null }),
      makeLines(),
    );
    expect(result.custom_mdm_estimate_version).toBe(1);
  });

  it('handles empty lines array', () => {
    const result = toErpQuotation(makeEstimate(), []);
    expect(result.items).toEqual([]);
    expect(result.net_total).toBe(0);
    expect(result.grand_total).toBe(0);
  });

  it('defaults uom to Nos when unit is null', () => {
    const result = toErpQuotation(makeEstimate(), [
      { description: 'Widget', quantity: 1, unit_cost: 10, unit: null, line_total: 10 },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].uom).toBe('Nos');
  });

  it('defaults notes to empty string when null', () => {
    const result = toErpQuotation(makeEstimate({ notes: null }), makeLines());
    expect(result.terms).toBe('');
  });

  it('handles special characters in description', () => {
    const result = toErpQuotation(makeEstimate(), [
      {
        description: 'Steel Beam 6" x 12\' (Grade A)',
        quantity: 5,
        unit_cost: 200,
        unit: 'pcs',
        line_total: 1000,
      },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_name).toBe('Steel Beam 6" x 12\' (Grade A)');
  });
});

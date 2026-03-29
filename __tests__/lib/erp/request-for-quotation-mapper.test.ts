import { describe, expect, it } from 'vitest';

import {
  mapRequestForQuotationToErp,
  type RequestForQuotationMapInput,
} from '@/lib/erp/request-for-quotation-mapper';

function makeInput(
  overrides: Partial<RequestForQuotationMapInput> = {},
): RequestForQuotationMapInput {
  return {
    id: 'rfq-001',
    rfq_number: 'RFQ-2026-001',
    transaction_date: '2026-03-29',
    message_for_supplier: 'Please quote for Q2 delivery',
    suppliers: [
      { supplier_name: 'Premier Electrical Ltd.', email: 'sales@premier.ca' },
      { supplier_name: 'Atlas Supply Co.', email: null },
    ],
    items: [
      {
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
        description: '12AWG copper cable',
        qty: 100,
        uom: 'Spool',
        warehouse: 'Main Warehouse',
      },
    ],
    ...overrides,
  };
}

describe('mapRequestForQuotationToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapRequestForQuotationToErp(makeInput());
    expect(result.naming_series).toBe('PUR-RFQ-.YYYY.-');
    expect(result.title).toBe('RFQ-2026-001');
    expect(result.transaction_date).toBe('2026-03-29');
    expect(result.message_for_supplier).toBe('Please quote for Q2 delivery');
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('rfq-001');
  });

  it('maps supplier list correctly', () => {
    const result = mapRequestForQuotationToErp(makeInput());
    const suppliers = result.suppliers as Record<string, unknown>[];
    expect(suppliers).toHaveLength(2);
    expect(suppliers[0].supplier).toBe('Premier Electrical Ltd.');
    expect(suppliers[0].email_id).toBe('sales@premier.ca');
    expect(suppliers[1].email_id).toBe('');
  });

  it('maps item lines with sequential idx', () => {
    const result = mapRequestForQuotationToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].item_code).toBe('CABLE-001');
    expect(items[0].qty).toBe(100);
  });

  it('defaults message_for_supplier to empty string when null', () => {
    const result = mapRequestForQuotationToErp(makeInput({ message_for_supplier: null }));
    expect(result.message_for_supplier).toBe('');
  });
});

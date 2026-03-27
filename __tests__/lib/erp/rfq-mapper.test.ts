import { describe, expect, it } from 'vitest';

import {
  type RfqItemInput,
  type RfqPackageInput,
  toErpRequestForQuotation,
} from '@/lib/erp/rfq-mapper';

function makeRfq(overrides: Partial<RfqPackageInput> = {}): RfqPackageInput {
  return {
    id: 'rfq-001',
    rfq_number: 'RFQ-2026-0015',
    project_id: 'proj-001',
    project_name: 'MDM Telecom Tower A',
    title: 'Electrical Materials RFQ',
    description: 'Request for electrical materials for Tower A.',
    scope_of_work: 'Supply and delivery of cable trays, conduit, and fittings.',
    due_date: '2026-04-15',
    currency_code: 'CAD',
    status: 'open',
    ...overrides,
  };
}

function makeItems(): RfqItemInput[] {
  return [
    {
      description: 'Cable Tray 100mm',
      quantity: 50,
      unit: 'm',
      estimated_cost: 18.5,
    },
    {
      description: 'Steel Conduit 25mm',
      quantity: 200,
      unit: 'm',
      estimated_cost: 6.75,
    },
  ];
}

describe('toErpRequestForQuotation', () => {
  it('maps all RFQ header fields correctly', () => {
    const result = toErpRequestForQuotation(makeRfq(), makeItems());
    expect(result.title).toBe('Electrical Materials RFQ');
    expect(result.currency).toBe('CAD');
    expect(result.schedule_date).toBe('2026-04-15');
    expect(result.message_for_supplier).toBe(
      'Supply and delivery of cable trays, conduit, and fittings.',
    );
    expect(result.custom_mdm_rfq_id).toBe('rfq-001');
    expect(result.custom_mdm_project_id).toBe('proj-001');
    expect(result.custom_mdm_rfq_number).toBe('RFQ-2026-0015');
    expect(result.custom_mdm_project_name).toBe('MDM Telecom Tower A');
  });

  it('sets transaction_date to today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = toErpRequestForQuotation(makeRfq(), makeItems());
    expect(result.transaction_date).toBe(today);
  });

  it('maps line items correctly', () => {
    const result = toErpRequestForQuotation(makeRfq(), makeItems());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].item_code).toBe('Cable Tray 100mm');
    expect(items[0].item_name).toBe('Cable Tray 100mm');
    expect(items[0].qty).toBe(50);
    expect(items[0].uom).toBe('m');
    expect(items[0].rate).toBe(18.5);
    expect(items[0].idx).toBe(1);
    expect(items[1].idx).toBe(2);
    expect(items[1].item_code).toBe('Steel Conduit 25mm');
  });

  it('prefers item_code when provided over description fallback', () => {
    const result = toErpRequestForQuotation(makeRfq(), [
      {
        item_code: 'ELEC-CT-100',
        description: 'Cable Tray 100mm',
        quantity: 10,
        unit: 'm',
        estimated_cost: 18.5,
      },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_code).toBe('ELEC-CT-100');
  });

  it('generates ITEM-N fallback when description is empty', () => {
    const result = toErpRequestForQuotation(makeRfq(), [
      { description: '', quantity: 1, unit: null, estimated_cost: null },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_code).toBe('ITEM-1');
  });

  it('defaults currency to CAD when null', () => {
    const result = toErpRequestForQuotation(makeRfq({ currency_code: null }), makeItems());
    expect(result.currency).toBe('CAD');
  });

  it('sets schedule_date to null when due_date is null', () => {
    const result = toErpRequestForQuotation(makeRfq({ due_date: null }), makeItems());
    expect(result.schedule_date).toBeNull();
  });

  it('falls back to description when scope_of_work is null', () => {
    const result = toErpRequestForQuotation(makeRfq({ scope_of_work: null }), makeItems());
    expect(result.message_for_supplier).toBe('Request for electrical materials for Tower A.');
  });

  it('defaults message_for_supplier to empty string when both scope and description are null', () => {
    const result = toErpRequestForQuotation(
      makeRfq({ scope_of_work: null, description: null }),
      makeItems(),
    );
    expect(result.message_for_supplier).toBe('');
  });

  it('defaults project_name to empty string when null', () => {
    const result = toErpRequestForQuotation(makeRfq({ project_name: null }), makeItems());
    expect(result.custom_mdm_project_name).toBe('');
  });

  it('defaults uom to Nos when unit is null', () => {
    const result = toErpRequestForQuotation(makeRfq(), [
      { description: 'Misc Item', quantity: 1, unit: null, estimated_cost: 100 },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].uom).toBe('Nos');
  });

  it('defaults rate to 0 when estimated_cost is null', () => {
    const result = toErpRequestForQuotation(makeRfq(), [
      { description: 'TBD Item', quantity: 5, unit: 'ea', estimated_cost: null },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].rate).toBe(0);
  });

  it('handles empty items array', () => {
    const result = toErpRequestForQuotation(makeRfq(), []);
    expect(result.items).toEqual([]);
  });
});

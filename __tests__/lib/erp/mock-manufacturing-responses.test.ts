import { beforeEach, describe, expect, it } from 'vitest';

import {
  mockBatchResponse,
  mockBomResponse,
  mockItemPriceResponse,
  mockPriceListResponse,
  mockQualityInspectionResponse,
  mockSerialNoResponse,
  mockUomResponse,
  mockWorkOrderResponse,
  resetMockCounter,
} from '@/lib/erp/mock-responses';

describe('Mock Manufacturing/Inventory Responses', () => {
  beforeEach(() => {
    resetMockCounter();
  });

  describe('mockBomResponse', () => {
    it('returns valid BOM response shape', () => {
      const result = mockBomResponse({
        id: 'bom-1',
        item_code: 'ASSY-001',
        item_name: 'Assembly Kit',
        quantity: 1,
      });
      expect(result.doctype).toBe('BOM');
      expect(result.name).toContain('BOM-MOCK-');
      expect(result.data.item).toBe('ASSY-001');
      expect(result.data.quantity).toBe(1);
      expect(result.data.krewpact_id).toBe('bom-1');
    });
  });

  describe('mockWorkOrderResponse', () => {
    it('returns valid Work Order response shape', () => {
      const result = mockWorkOrderResponse({
        id: 'wo-1',
        production_item: 'ASSY-001',
        qty: 10,
      });
      expect(result.doctype).toBe('Work Order');
      expect(result.name).toContain('MFN-WO-MOCK-');
      expect(result.data.production_item).toBe('ASSY-001');
      expect(result.data.qty).toBe(10);
      expect(result.data.krewpact_id).toBe('wo-1');
    });
  });

  describe('mockQualityInspectionResponse', () => {
    it('returns valid Quality Inspection response shape', () => {
      const result = mockQualityInspectionResponse({
        id: 'qi-1',
        inspection_type: 'Incoming',
        item_code: 'CABLE-001',
      });
      expect(result.doctype).toBe('Quality Inspection');
      expect(result.name).toContain('QI-MOCK-');
      expect(result.data.inspection_type).toBe('Incoming');
      expect(result.data.krewpact_id).toBe('qi-1');
    });
  });

  describe('mockSerialNoResponse', () => {
    it('returns valid Serial No response shape', () => {
      const result = mockSerialNoResponse({
        id: 'sn-1',
        serial_no: 'SN-001',
        item_code: 'CABLE-001',
      });
      expect(result.doctype).toBe('Serial No');
      expect(result.name).toContain('SN-MOCK-');
      expect(result.data.serial_no).toBe('SN-001');
      expect(result.data.krewpact_id).toBe('sn-1');
    });
  });

  describe('mockBatchResponse', () => {
    it('returns valid Batch response shape', () => {
      const result = mockBatchResponse({
        id: 'batch-1',
        batch_id: 'BATCH-001',
        item_code: 'CABLE-001',
      });
      expect(result.doctype).toBe('Batch');
      expect(result.name).toContain('BATCH-MOCK-');
      expect(result.data.batch_id).toBe('BATCH-001');
      expect(result.data.krewpact_id).toBe('batch-1');
    });
  });

  describe('mockUomResponse', () => {
    it('returns valid UOM response shape', () => {
      const result = mockUomResponse({
        id: 'uom-1',
        uom_name: 'Spool',
      });
      expect(result.doctype).toBe('UOM');
      expect(result.name).toContain('UOM-MOCK-');
      expect(result.data.uom_name).toBe('Spool');
      expect(result.data.krewpact_id).toBe('uom-1');
    });
  });

  describe('mockItemPriceResponse', () => {
    it('returns valid Item Price response shape', () => {
      const result = mockItemPriceResponse({
        id: 'ip-1',
        item_code: 'CABLE-001',
        price_list: 'Standard Buying',
        price_list_rate: 50.0,
      });
      expect(result.doctype).toBe('Item Price');
      expect(result.name).toContain('IP-MOCK-');
      expect(result.data.price_list_rate).toBe(50.0);
      expect(result.data.krewpact_id).toBe('ip-1');
    });
  });

  describe('mockPriceListResponse', () => {
    it('returns valid Price List response shape', () => {
      const result = mockPriceListResponse({
        id: 'pl-1',
        price_list_name: 'Standard Buying',
      });
      expect(result.doctype).toBe('Price List');
      expect(result.name).toContain('PL-MOCK-');
      expect(result.data.price_list_name).toBe('Standard Buying');
      expect(result.data.krewpact_id).toBe('pl-1');
    });
  });

  it('generates unique mock IDs across types', () => {
    const bom = mockBomResponse({ id: '1', item_code: 'A', item_name: 'A', quantity: 1 });
    const wo = mockWorkOrderResponse({ id: '2', production_item: 'B', qty: 1 });
    const qi = mockQualityInspectionResponse({
      id: '3',
      inspection_type: 'Incoming',
      item_code: 'C',
    });
    expect(bom.name).not.toBe(wo.name);
    expect(wo.name).not.toBe(qi.name);
  });
});

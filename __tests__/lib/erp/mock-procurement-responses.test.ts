import { beforeEach, describe, expect, it } from 'vitest';

import {
  mockItemResponse,
  mockMaterialRequestResponse,
  mockRequestForQuotationResponse,
  mockStockEntryResponse,
  mockSupplierQuotationResponse,
  mockWarehouseResponse,
} from '@/lib/erp/mock-procurement-responses';
import { resetMockCounter } from '@/lib/erp/mock-types';

describe('mock-procurement-responses', () => {
  beforeEach(() => {
    resetMockCounter();
  });

  describe('mockSupplierQuotationResponse', () => {
    it('generates a valid Supplier Quotation response', () => {
      const result = mockSupplierQuotationResponse({
        id: 'sq-001',
        quotation_number: 'SQ-2026-001',
        supplier_name: 'Premier Electrical',
        total_amount: 15000,
      });

      expect(result.doctype).toBe('Supplier Quotation');
      expect(result.name).toMatch(/^SQTN-MOCK-/);
      expect(result.data.supplier).toBe('Premier Electrical');
      expect(result.data.grand_total).toBe(15000);
      expect(result.data.krewpact_id).toBe('sq-001');
      expect(result.data.currency).toBe('CAD');
    });
  });

  describe('mockRequestForQuotationResponse', () => {
    it('generates a valid Request for Quotation response', () => {
      const result = mockRequestForQuotationResponse({
        id: 'rfq-001',
        rfq_number: 'RFQ-2026-001',
        supplier_count: 3,
      });

      expect(result.doctype).toBe('Request for Quotation');
      expect(result.name).toMatch(/^PUR-RFQ-MOCK-/);
      expect(result.data.title).toBe('RFQ-2026-001');
      expect(result.data.krewpact_id).toBe('rfq-001');
    });
  });

  describe('mockMaterialRequestResponse', () => {
    it('generates a valid Material Request response', () => {
      const result = mockMaterialRequestResponse({
        id: 'mr-001',
        request_number: 'MR-2026-001',
        request_type: 'Purchase',
      });

      expect(result.doctype).toBe('Material Request');
      expect(result.name).toMatch(/^MAT-MR-MOCK-/);
      expect(result.data.material_request_type).toBe('Purchase');
      expect(result.data.krewpact_id).toBe('mr-001');
    });
  });

  describe('mockStockEntryResponse', () => {
    it('generates a valid Stock Entry response', () => {
      const result = mockStockEntryResponse({
        id: 'ste-001',
        entry_type: 'Material Receipt',
        posting_date: '2026-03-29',
      });

      expect(result.doctype).toBe('Stock Entry');
      expect(result.name).toMatch(/^MAT-STE-MOCK-/);
      expect(result.data.stock_entry_type).toBe('Material Receipt');
      expect(result.data.posting_date).toBe('2026-03-29');
      expect(result.data.krewpact_id).toBe('ste-001');
    });
  });

  describe('mockWarehouseResponse', () => {
    it('generates a valid Warehouse response', () => {
      const result = mockWarehouseResponse({
        id: 'wh-001',
        warehouse_name: 'Main Warehouse',
      });

      expect(result.doctype).toBe('Warehouse');
      expect(result.name).toMatch(/^WH-MOCK-/);
      expect(result.data.warehouse_name).toBe('Main Warehouse');
      expect(result.data.krewpact_id).toBe('wh-001');
    });
  });

  describe('mockItemResponse', () => {
    it('generates a valid Item response', () => {
      const result = mockItemResponse({
        id: 'item-001',
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
      });

      expect(result.doctype).toBe('Item');
      expect(result.name).toMatch(/^ITEM-MOCK-/);
      expect(result.data.item_code).toBe('CABLE-001');
      expect(result.data.item_name).toBe('Copper Cable 12AWG');
      expect(result.data.country_of_origin).toBe('Canada');
      expect(result.data.krewpact_id).toBe('item-001');
    });
  });

  describe('sequential mock IDs', () => {
    it('generates unique sequential IDs across all doctypes', () => {
      const sq = mockSupplierQuotationResponse({
        id: 'sq-1',
        quotation_number: 'SQ-1',
        supplier_name: 'A',
        total_amount: 0,
      });
      const rfq = mockRequestForQuotationResponse({
        id: 'rfq-1',
        rfq_number: 'RFQ-1',
        supplier_count: 0,
      });
      const item = mockItemResponse({
        id: 'item-1',
        item_code: 'I-1',
        item_name: 'Item 1',
      });

      // All should have unique names (different prefixes + sequential counter)
      expect(sq.name).not.toBe(rfq.name);
      expect(rfq.name).not.toBe(item.name);
    });
  });
});

import { beforeEach, describe, expect, it } from 'vitest';

import {
  mockBankAccountCreateResponse,
  mockBudgetCreateResponse,
  mockCostCenterCreateResponse,
  mockGlEntryListResponse,
  mockGlEntryResponse,
  mockModeOfPaymentResponse,
  mockPaymentEntryCreateResponse,
  mockPaymentEntryResponse,
  mockPurchaseInvoiceResponse,
  mockSalesInvoiceResponse,
} from '@/lib/erp/mock-finance-responses';
import { resetMockCounter } from '@/lib/erp/mock-types';

describe('mock-finance-responses', () => {
  beforeEach(() => {
    resetMockCounter();
  });

  describe('existing read-only mocks', () => {
    it('generates a valid Sales Invoice response', () => {
      const result = mockSalesInvoiceResponse('SINV-001');
      expect(result.doctype).toBe('Sales Invoice');
      expect(result.name).toBe('SINV-001');
      expect(result.data.grand_total).toBe(10000);
    });

    it('generates a valid Purchase Invoice response', () => {
      const result = mockPurchaseInvoiceResponse('PINV-001');
      expect(result.doctype).toBe('Purchase Invoice');
      expect(result.name).toBe('PINV-001');
    });

    it('generates a valid Payment Entry read response', () => {
      const result = mockPaymentEntryResponse('PE-001');
      expect(result.doctype).toBe('Payment Entry');
      expect(result.name).toBe('PE-001');
      expect(result.data.paid_amount).toBe(5000);
    });
  });

  describe('mockPaymentEntryCreateResponse', () => {
    it('generates a valid Payment Entry create response', () => {
      const result = mockPaymentEntryCreateResponse({
        id: 'pe-001',
        payment_type: 'Receive',
        paid_amount: 7500,
      });
      expect(result.doctype).toBe('Payment Entry');
      expect(result.name).toMatch(/^PE-MOCK-/);
      expect(result.data.payment_type).toBe('Receive');
      expect(result.data.paid_amount).toBe(7500);
      expect(result.data.krewpact_id).toBe('pe-001');
    });
  });

  describe('mockGlEntryResponse', () => {
    it('generates a valid GL Entry response', () => {
      const result = mockGlEntryResponse('GL-001');
      expect(result.doctype).toBe('GL Entry');
      expect(result.name).toBe('GL-001');
      expect(result.data.debit).toBe(5000);
      expect(result.data.account).toContain('Accounts Receivable');
    });
  });

  describe('mockGlEntryListResponse', () => {
    it('generates the correct number of GL entries', () => {
      const result = mockGlEntryListResponse(5);
      expect(result.data).toHaveLength(5);
    });

    it('alternates debit/credit entries', () => {
      const result = mockGlEntryListResponse(4);
      expect(result.data[0].debit).toBe(1000);
      expect(result.data[0].credit).toBe(0);
      expect(result.data[1].debit).toBe(0);
      expect(result.data[1].credit).toBe(2000);
    });
  });

  describe('mockBankAccountCreateResponse', () => {
    it('generates a valid Bank Account response', () => {
      const result = mockBankAccountCreateResponse({
        id: 'ba-001',
        account_name: 'MDM Operating',
        bank: 'TD Canada Trust',
      });
      expect(result.doctype).toBe('Bank Account');
      expect(result.name).toMatch(/^BA-MOCK-/);
      expect(result.data.account_name).toBe('MDM Operating');
      expect(result.data.bank).toBe('TD Canada Trust');
      expect(result.data.krewpact_id).toBe('ba-001');
    });
  });

  describe('mockModeOfPaymentResponse', () => {
    it('generates a valid Mode of Payment response', () => {
      const result = mockModeOfPaymentResponse('Wire Transfer');
      expect(result.doctype).toBe('Mode of Payment');
      expect(result.name).toBe('Wire Transfer');
      expect(result.data.type).toBe('Bank');
      expect(result.data.enabled).toBe(1);
    });
  });

  describe('mockCostCenterCreateResponse', () => {
    it('generates a valid Cost Center response', () => {
      const result = mockCostCenterCreateResponse({
        id: 'cc-001',
        cost_center_name: 'Contracting',
        company: 'MDM Group Inc.',
      });
      expect(result.doctype).toBe('Cost Center');
      expect(result.name).toMatch(/^CC-MOCK-/);
      expect(result.data.cost_center_name).toBe('Contracting');
      expect(result.data.krewpact_id).toBe('cc-001');
    });
  });

  describe('mockBudgetCreateResponse', () => {
    it('generates a valid Budget response', () => {
      const result = mockBudgetCreateResponse({
        id: 'bdg-001',
        fiscal_year: '2026',
        company: 'MDM Group Inc.',
      });
      expect(result.doctype).toBe('Budget');
      expect(result.name).toMatch(/^BDG-MOCK-/);
      expect(result.data.fiscal_year).toBe('2026');
      expect(result.data.krewpact_id).toBe('bdg-001');
    });
  });

  describe('sequential mock IDs', () => {
    it('generates unique sequential IDs across finance doctypes', () => {
      const pe = mockPaymentEntryCreateResponse({
        id: 'pe-1',
        payment_type: 'Receive',
        paid_amount: 0,
      });
      const ba = mockBankAccountCreateResponse({
        id: 'ba-1',
        account_name: 'A',
        bank: 'B',
      });
      const cc = mockCostCenterCreateResponse({
        id: 'cc-1',
        cost_center_name: 'C',
        company: 'D',
      });

      expect(pe.name).not.toBe(ba.name);
      expect(ba.name).not.toBe(cc.name);
    });
  });
});

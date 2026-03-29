/**
 * Mock ERPNext finance response generators.
 * Sales Invoice, Purchase Invoice, Payment Entry (read-only).
 * GL Entry, Bank Account, Mode of Payment, Cost Center, Budget (Batch 2B).
 */

import { nextMockId } from './mock-types';

/**
 * Generate a mock ERPNext Sales Invoice response (inbound read).
 */
export function mockSalesInvoiceResponse(docname: string): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'Sales Invoice',
    name: docname,
    data: {
      name: docname,
      doctype: 'Sales Invoice',
      customer: 'MOCK-CUSTOMER',
      posting_date: new Date().toISOString().split('T')[0],
      grand_total: 10000,
      outstanding_amount: 10000,
      status: 'Unpaid',
      currency: 'CAD',
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 1,
    },
  };
}

/**
 * Generate a mock ERPNext Purchase Invoice response (inbound read).
 */
export function mockPurchaseInvoiceResponse(docname: string): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'Purchase Invoice',
    name: docname,
    data: {
      name: docname,
      doctype: 'Purchase Invoice',
      supplier: 'MOCK-SUPPLIER',
      posting_date: new Date().toISOString().split('T')[0],
      grand_total: 5000,
      outstanding_amount: 5000,
      status: 'Unpaid',
      currency: 'CAD',
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 1,
    },
  };
}

/**
 * Generate a mock ERPNext Payment Entry response (inbound read).
 */
export function mockPaymentEntryResponse(docname: string): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'Payment Entry',
    name: docname,
    data: {
      name: docname,
      doctype: 'Payment Entry',
      payment_type: 'Receive',
      party_type: 'Customer',
      party: 'MOCK-CUSTOMER',
      posting_date: new Date().toISOString().split('T')[0],
      paid_amount: 5000,
      received_amount: 5000,
      currency: 'CAD',
      status: 'Submitted',
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: 'SINV-001',
          total_amount: 10000,
          allocated_amount: 5000,
        },
      ],
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 1,
    },
  };
}

/**
 * Generate a mock ERPNext Payment Entry create response (outbound write).
 */
export function mockPaymentEntryCreateResponse(pe: {
  id: string;
  payment_type: string;
  paid_amount: number;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('PE');
  return {
    doctype: 'Payment Entry',
    name: docname,
    data: {
      name: docname,
      doctype: 'Payment Entry',
      payment_type: pe.payment_type,
      paid_amount: pe.paid_amount,
      currency: 'CAD',
      krewpact_id: pe.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext GL Entry response (inbound read only).
 */
export function mockGlEntryResponse(docname: string): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'GL Entry',
    name: docname,
    data: {
      name: docname,
      doctype: 'GL Entry',
      posting_date: new Date().toISOString().split('T')[0],
      account: '1100 - Accounts Receivable - MDM',
      party_type: 'Customer',
      party: 'MOCK-CUSTOMER',
      debit: 5000,
      credit: 0,
      debit_in_account_currency: 5000,
      credit_in_account_currency: 0,
      account_currency: 'CAD',
      cost_center: 'Main - MDM',
      project: '',
      voucher_type: 'Sales Invoice',
      voucher_no: 'SINV-001',
      against: '4100 - Revenue - MDM',
      company: 'MDM Group Inc.',
      is_cancelled: 0,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 1,
    },
  };
}

/**
 * Generate a mock ERPNext GL Entry list response (inbound read only).
 */
export function mockGlEntryListResponse(count: number): {
  data: Record<string, unknown>[];
} {
  const entries: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      name: `GL-MOCK-${String(i + 1).padStart(3, '0')}`,
      posting_date: new Date().toISOString().split('T')[0],
      account: i % 2 === 0 ? '1100 - Accounts Receivable - MDM' : '4100 - Revenue - MDM',
      debit: i % 2 === 0 ? 1000 * (i + 1) : 0,
      credit: i % 2 === 0 ? 0 : 1000 * (i + 1),
      voucher_type: 'Sales Invoice',
      voucher_no: `SINV-MOCK-${String(i + 1).padStart(3, '0')}`,
      company: 'MDM Group Inc.',
      is_cancelled: 0,
    });
  }
  return { data: entries };
}

/**
 * Generate a mock ERPNext Bank Account create response (outbound write).
 */
export function mockBankAccountCreateResponse(ba: {
  id: string;
  account_name: string;
  bank: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('BA');
  return {
    doctype: 'Bank Account',
    name: docname,
    data: {
      name: docname,
      doctype: 'Bank Account',
      account_name: ba.account_name,
      bank: ba.bank,
      currency: 'CAD',
      krewpact_id: ba.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Mode of Payment response (inbound read).
 */
export function mockModeOfPaymentResponse(docname: string): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'Mode of Payment',
    name: docname,
    data: {
      name: docname,
      doctype: 'Mode of Payment',
      mode_of_payment: docname,
      type: 'Bank',
      enabled: 1,
      accounts: [
        {
          company: 'MDM Group Inc.',
          default_account: '1200 - Bank - MDM',
        },
      ],
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Cost Center create response (outbound write).
 */
export function mockCostCenterCreateResponse(cc: {
  id: string;
  cost_center_name: string;
  company: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('CC');
  return {
    doctype: 'Cost Center',
    name: docname,
    data: {
      name: docname,
      doctype: 'Cost Center',
      cost_center_name: cc.cost_center_name,
      company: cc.company,
      is_group: 0,
      krewpact_id: cc.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Budget create response (outbound write).
 */
export function mockBudgetCreateResponse(budget: {
  id: string;
  fiscal_year: string;
  company: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('BDG');
  return {
    doctype: 'Budget',
    name: docname,
    data: {
      name: docname,
      doctype: 'Budget',
      fiscal_year: budget.fiscal_year,
      company: budget.company,
      budget_against: 'Cost Center',
      currency: 'CAD',
      krewpact_id: budget.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

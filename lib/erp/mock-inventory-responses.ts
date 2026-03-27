/**
 * Mock ERPNext inventory response generators.
 * Purchase Order, Purchase Receipt, Journal Entry.
 */

import { nextMockId } from './mock-types';

/**
 * Generate a mock ERPNext Purchase Order response from a KrewPact inventory PO.
 */
export function mockPurchaseOrderResponse(po: {
  id: string;
  po_number: string;
  supplier_name: string;
  total_amount: number;
  items: Record<string, unknown>[];
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('PUR-ORD');
  return {
    doctype: 'Purchase Order',
    name: docname,
    data: {
      name: docname,
      doctype: 'Purchase Order',
      title: po.po_number,
      supplier: po.supplier_name,
      transaction_date: new Date().toISOString().split('T')[0],
      grand_total: po.total_amount,
      currency: 'CAD',
      krewpact_id: po.id,
      items: po.items,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Purchase Receipt response from a KrewPact goods receipt.
 */
export function mockPurchaseReceiptResponse(gr: {
  id: string;
  gr_number: string;
  po_name: string;
  items: Record<string, unknown>[];
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('MAT-PRE');
  return {
    doctype: 'Purchase Receipt',
    name: docname,
    data: {
      name: docname,
      doctype: 'Purchase Receipt',
      title: gr.gr_number,
      posting_date: new Date().toISOString().split('T')[0],
      purchase_order: gr.po_name,
      currency: 'CAD',
      krewpact_id: gr.id,
      items: gr.items,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Journal Entry response for material cost sync.
 */
export function mockJournalEntryResponse(entry: {
  id: string;
  amount: number;
  projectRef: string;
  startDate: string;
  endDate: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('JV');
  return {
    doctype: 'Journal Entry',
    name: docname,
    data: {
      name: docname,
      doctype: 'Journal Entry',
      voucher_type: 'Journal Entry',
      posting_date: entry.endDate,
      total_debit: entry.amount,
      total_credit: entry.amount,
      user_remark: `Material cost for ${entry.projectRef} (${entry.startDate} to ${entry.endDate})`,
      currency: 'CAD',
      krewpact_id: entry.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

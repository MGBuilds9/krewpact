/**
 * Mock ERPNext finance response generators (read-only).
 * Sales Invoice, Purchase Invoice, Payment Entry.
 */

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

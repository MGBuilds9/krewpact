/**
 * Mock ERPNext response generators for development/testing.
 * Generate realistic ERPNext API response shapes without hitting a real instance.
 */

interface AccountData {
  id: string;
  account_name: string;
  account_type?: string;
  billing_address?: Record<string, unknown> | null;
}

interface EstimateData {
  id: string;
  estimate_number: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  currency_code?: string;
  account_id?: string | null;
  contact_id?: string | null;
}

interface EstimateLineData {
  description: string;
  quantity: number;
  unit_cost: number;
  unit?: string | null;
  line_total: number;
}

let mockCounter = 0;

function nextMockId(prefix: string): string {
  mockCounter++;
  return `${prefix}-MOCK-${String(mockCounter).padStart(3, '0')}`;
}

/** Reset mock counter (for testing) */
export function resetMockCounter(): void {
  mockCounter = 0;
}

/**
 * Generate a mock ERPNext Customer response from a KrewPact account.
 */
export function mockCustomerResponse(account: AccountData): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('CUST');
  return {
    doctype: 'Customer',
    name: docname,
    data: {
      name: docname,
      doctype: 'Customer',
      customer_name: account.account_name,
      customer_type: account.account_type === 'trade_partner' ? 'Company' : 'Company',
      customer_group: 'All Customer Groups',
      territory: 'Canada',
      krewpact_id: account.id,
      default_currency: 'CAD',
      primary_address: account.billing_address
        ? JSON.stringify(account.billing_address)
        : null,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Quotation response from a KrewPact estimate.
 */
export function mockQuotationResponse(
  estimate: EstimateData,
  lines: EstimateLineData[],
): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('QTN');
  return {
    doctype: 'Quotation',
    name: docname,
    data: {
      name: docname,
      doctype: 'Quotation',
      title: estimate.estimate_number,
      quotation_to: 'Customer',
      party_name: estimate.account_id || null,
      contact_person: estimate.contact_id || null,
      currency: estimate.currency_code || 'CAD',
      net_total: estimate.subtotal_amount,
      total_taxes_and_charges: estimate.tax_amount,
      grand_total: estimate.total_amount,
      krewpact_id: estimate.id,
      items: lines.map((line, idx) => ({
        idx: idx + 1,
        item_name: line.description,
        qty: line.quantity,
        rate: line.unit_cost,
        uom: line.unit || 'Nos',
        amount: line.line_total,
      })),
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

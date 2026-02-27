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
/**
 * Generate a mock ERPNext Opportunity response from a KrewPact opportunity.
 */
export function mockOpportunityResponse(opp: {
  id: string;
  opportunity_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('OPP');
  return {
    doctype: 'Opportunity',
    name: docname,
    data: {
      name: docname,
      doctype: 'Opportunity',
      title: opp.opportunity_name,
      opportunity_from: 'Customer',
      opportunity_type: 'Sales',
      status: 'Open',
      krewpact_id: opp.id,
      currency: 'CAD',
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Sales Order response from a won deal.
 */
export function mockSalesOrderResponse(input: {
  id: string;
  name: string;
  amount: number;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('SO');
  return {
    doctype: 'Sales Order',
    name: docname,
    data: {
      name: docname,
      doctype: 'Sales Order',
      title: input.name,
      customer: '',
      transaction_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date().toISOString().split('T')[0],
      currency: 'CAD',
      grand_total: input.amount,
      krewpact_id: input.id,
      items: [
        {
          idx: 1,
          item_name: input.name,
          qty: 1,
          rate: input.amount,
          amount: input.amount,
        },
      ],
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Contact response from a KrewPact contact.
 */
export function mockContactResponse(contact: {
  id: string;
  first_name: string;
  last_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('CONT');
  return {
    doctype: 'Contact',
    name: docname,
    data: {
      name: docname,
      doctype: 'Contact',
      first_name: contact.first_name,
      last_name: contact.last_name,
      full_name: `${contact.first_name} ${contact.last_name}`.trim(),
      krewpact_id: contact.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Project response from a KrewPact project.
 */
export function mockProjectResponse(project: {
  id: string;
  project_number: string;
  project_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('PRJ');
  return {
    doctype: 'Project',
    name: docname,
    data: {
      name: docname,
      doctype: 'Project',
      project_name: `${project.project_number} — ${project.project_name}`,
      status: 'Open',
      krewpact_id: project.id,
      currency: 'CAD',
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Task response from a KrewPact task.
 */
export function mockTaskResponse(task: {
  id: string;
  title: string;
  project_id: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('TASK');
  return {
    doctype: 'Task',
    name: docname,
    data: {
      name: docname,
      doctype: 'Task',
      subject: task.title,
      project: task.project_id,
      status: 'Open',
      krewpact_id: task.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Supplier response from a KrewPact trade partner.
 */
export function mockSupplierResponse(supplier: {
  id: string;
  company_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('SUP');
  return {
    doctype: 'Supplier',
    name: docname,
    data: {
      name: docname,
      doctype: 'Supplier',
      supplier_name: supplier.company_name,
      supplier_type: 'Company',
      supplier_group: 'All Supplier Groups',
      country: 'Canada',
      default_currency: 'CAD',
      krewpact_id: supplier.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Expense Claim response from a KrewPact expense claim.
 */
export function mockExpenseClaimResponse(expense: {
  id: string;
  amount: number;
  expense_date: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('EXP');
  return {
    doctype: 'Expense Claim',
    name: docname,
    data: {
      name: docname,
      doctype: 'Expense Claim',
      posting_date: expense.expense_date,
      total_claimed_amount: expense.amount,
      total_sanctioned_amount: expense.amount,
      currency: 'CAD',
      krewpact_id: expense.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Timesheet response from a KrewPact timesheet batch.
 */
export function mockTimesheetResponse(timesheet: {
  id: string;
  total_hours: number;
  period_start: string;
  period_end: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('TS');
  return {
    doctype: 'Timesheet',
    name: docname,
    data: {
      name: docname,
      doctype: 'Timesheet',
      start_date: timesheet.period_start,
      end_date: timesheet.period_end,
      total_hours: timesheet.total_hours,
      currency: 'CAD',
      krewpact_id: timesheet.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

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

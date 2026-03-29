/**
 * Mock ERPNext procurement chain response generators.
 * Supplier Quotation, Request for Quotation, Material Request,
 * Stock Entry, Warehouse, Item.
 *
 * Purchase Order and Purchase Receipt mocks are in mock-inventory-responses.ts.
 */

import { nextMockId } from './mock-types';

/**
 * Generate a mock ERPNext Supplier Quotation response.
 */
export function mockSupplierQuotationResponse(sq: {
  id: string;
  quotation_number: string;
  supplier_name: string;
  total_amount: number;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('SQTN');
  return {
    doctype: 'Supplier Quotation',
    name: docname,
    data: {
      name: docname,
      doctype: 'Supplier Quotation',
      title: sq.quotation_number,
      supplier: sq.supplier_name,
      grand_total: sq.total_amount,
      currency: 'CAD',
      krewpact_id: sq.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Request for Quotation response.
 */
export function mockRequestForQuotationResponse(rfq: {
  id: string;
  rfq_number: string;
  supplier_count: number;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('PUR-RFQ');
  return {
    doctype: 'Request for Quotation',
    name: docname,
    data: {
      name: docname,
      doctype: 'Request for Quotation',
      title: rfq.rfq_number,
      status: 'Draft',
      currency: 'CAD',
      krewpact_id: rfq.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Material Request response.
 */
export function mockMaterialRequestResponse(mr: {
  id: string;
  request_number: string;
  request_type: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('MAT-MR');
  return {
    doctype: 'Material Request',
    name: docname,
    data: {
      name: docname,
      doctype: 'Material Request',
      title: mr.request_number,
      material_request_type: mr.request_type,
      status: 'Pending',
      currency: 'CAD',
      krewpact_id: mr.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Stock Entry response.
 */
export function mockStockEntryResponse(entry: {
  id: string;
  entry_type: string;
  posting_date: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('MAT-STE');
  return {
    doctype: 'Stock Entry',
    name: docname,
    data: {
      name: docname,
      doctype: 'Stock Entry',
      stock_entry_type: entry.entry_type,
      posting_date: entry.posting_date,
      currency: 'CAD',
      krewpact_id: entry.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Warehouse response.
 */
export function mockWarehouseResponse(wh: {
  id: string;
  warehouse_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('WH');
  return {
    doctype: 'Warehouse',
    name: docname,
    data: {
      name: docname,
      doctype: 'Warehouse',
      warehouse_name: wh.warehouse_name,
      is_group: 0,
      krewpact_id: wh.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Item response.
 */
export function mockItemResponse(item: {
  id: string;
  item_code: string;
  item_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('ITEM');
  return {
    doctype: 'Item',
    name: docname,
    data: {
      name: docname,
      doctype: 'Item',
      item_code: item.item_code,
      item_name: item.item_name,
      item_group: 'All Item Groups',
      stock_uom: 'Nos',
      is_stock_item: 1,
      country_of_origin: 'Canada',
      krewpact_id: item.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

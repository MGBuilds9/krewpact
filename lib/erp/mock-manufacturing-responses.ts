/**
 * Mock ERPNext manufacturing/inventory chain response generators.
 * BOM, Work Order, Quality Inspection, Serial No, Batch,
 * UOM, Item Price, Price List.
 */

import { nextMockId } from './mock-types';

/**
 * Generate a mock ERPNext BOM response.
 */
export function mockBomResponse(bom: {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('BOM');
  return {
    doctype: 'BOM',
    name: docname,
    data: {
      name: docname,
      doctype: 'BOM',
      item: bom.item_code,
      item_name: bom.item_name,
      quantity: bom.quantity,
      is_active: 1,
      is_default: 1,
      currency: 'CAD',
      krewpact_id: bom.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Work Order response.
 */
export function mockWorkOrderResponse(wo: { id: string; production_item: string; qty: number }): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('MFN-WO');
  return {
    doctype: 'Work Order',
    name: docname,
    data: {
      name: docname,
      doctype: 'Work Order',
      production_item: wo.production_item,
      qty: wo.qty,
      status: 'Draft',
      currency: 'CAD',
      krewpact_id: wo.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Quality Inspection response.
 */
export function mockQualityInspectionResponse(qi: {
  id: string;
  inspection_type: string;
  item_code: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('QI');
  return {
    doctype: 'Quality Inspection',
    name: docname,
    data: {
      name: docname,
      doctype: 'Quality Inspection',
      inspection_type: qi.inspection_type,
      item_code: qi.item_code,
      status: 'Accepted',
      krewpact_id: qi.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Serial No response.
 */
export function mockSerialNoResponse(sn: { id: string; serial_no: string; item_code: string }): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('SN');
  return {
    doctype: 'Serial No',
    name: docname,
    data: {
      name: docname,
      doctype: 'Serial No',
      serial_no: sn.serial_no,
      item_code: sn.item_code,
      status: 'Active',
      krewpact_id: sn.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Batch response.
 */
export function mockBatchResponse(batch: { id: string; batch_id: string; item_code: string }): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('BATCH');
  return {
    doctype: 'Batch',
    name: docname,
    data: {
      name: docname,
      doctype: 'Batch',
      batch_id: batch.batch_id,
      item: batch.item_code,
      krewpact_id: batch.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext UOM response.
 */
export function mockUomResponse(uom: { id: string; uom_name: string }): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('UOM');
  return {
    doctype: 'UOM',
    name: docname,
    data: {
      name: docname,
      doctype: 'UOM',
      uom_name: uom.uom_name,
      must_be_whole_number: 0,
      krewpact_id: uom.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Item Price response.
 */
export function mockItemPriceResponse(ip: {
  id: string;
  item_code: string;
  price_list: string;
  price_list_rate: number;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('IP');
  return {
    doctype: 'Item Price',
    name: docname,
    data: {
      name: docname,
      doctype: 'Item Price',
      item_code: ip.item_code,
      price_list: ip.price_list,
      price_list_rate: ip.price_list_rate,
      currency: 'CAD',
      krewpact_id: ip.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Price List response.
 */
export function mockPriceListResponse(pl: { id: string; price_list_name: string }): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('PL');
  return {
    doctype: 'Price List',
    name: docname,
    data: {
      name: docname,
      doctype: 'Price List',
      price_list_name: pl.price_list_name,
      currency: 'CAD',
      buying: 1,
      selling: 0,
      enabled: 1,
      krewpact_id: pl.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

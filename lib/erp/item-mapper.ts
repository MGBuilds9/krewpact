/**
 * Maps KrewPact item data to ERPNext Item doctype format.
 * Pure function — no side effects or database calls.
 */

export interface ItemMapInput {
  id: string;
  item_code: string;
  item_name: string;
  item_group: string;
  description: string | null;
  uom: string;
  is_stock_item: boolean;
  is_purchase_item: boolean;
  is_sales_item: boolean;
  default_warehouse: string | null;
}

/**
 * Map a KrewPact item to an ERPNext Item document.
 */
export function mapItemToErp(item: ItemMapInput): Record<string, unknown> {
  return {
    item_code: item.item_code,
    item_name: item.item_name,
    item_group: item.item_group || 'All Item Groups',
    description: item.description || item.item_name,
    stock_uom: item.uom || 'Nos',
    is_stock_item: item.is_stock_item ? 1 : 0,
    is_purchase_item: item.is_purchase_item ? 1 : 0,
    is_sales_item: item.is_sales_item ? 1 : 0,
    default_material_request_type: 'Purchase',
    country_of_origin: 'Canada',
    krewpact_id: item.id,
    ...(item.default_warehouse ? { default_warehouse: item.default_warehouse } : {}),
  };
}

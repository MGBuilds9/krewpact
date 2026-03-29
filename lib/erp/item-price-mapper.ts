/**
 * Maps KrewPact item price data to ERPNext Item Price doctype format.
 * Pure function — no side effects or database calls.
 */

export interface ItemPriceMapInput {
  id: string;
  item_code: string;
  item_name: string;
  price_list: string;
  price_list_rate: number;
  currency: string;
  uom: string | null;
  min_qty: number;
  valid_from: string | null;
  valid_upto: string | null;
}

/**
 * Map a KrewPact item price to an ERPNext Item Price document.
 */
export function mapItemPriceToErp(ip: ItemPriceMapInput): Record<string, unknown> {
  return {
    item_code: ip.item_code,
    item_name: ip.item_name,
    price_list: ip.price_list,
    price_list_rate: ip.price_list_rate,
    currency: ip.currency || 'CAD',
    uom: ip.uom || 'Nos',
    min_qty: ip.min_qty,
    krewpact_id: ip.id,
    ...(ip.valid_from ? { valid_from: ip.valid_from } : {}),
    ...(ip.valid_upto ? { valid_upto: ip.valid_upto } : {}),
  };
}

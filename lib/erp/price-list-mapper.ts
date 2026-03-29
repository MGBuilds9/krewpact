/**
 * Maps KrewPact price list data to ERPNext Price List doctype format.
 * Pure function — no side effects or database calls.
 */

export interface PriceListMapInput {
  id: string;
  price_list_name: string;
  currency: string;
  buying: boolean;
  selling: boolean;
  enabled: boolean;
}

/**
 * Map a KrewPact price list to an ERPNext Price List document.
 */
export function mapPriceListToErp(pl: PriceListMapInput): Record<string, unknown> {
  return {
    price_list_name: pl.price_list_name,
    currency: pl.currency || 'CAD',
    buying: pl.buying ? 1 : 0,
    selling: pl.selling ? 1 : 0,
    enabled: pl.enabled ? 1 : 0,
    krewpact_id: pl.id,
  };
}

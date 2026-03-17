/**
 * Maps a won KrewPact opportunity to an ERPNext Sales Order doctype.
 * Pure function — no side effects or database calls.
 */

export interface SalesOrderLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface SalesOrderMapInput {
  opportunityId: string;
  opportunityName: string;
  accountId: string | null;
  estimatedRevenue: number | null;
  wonDate: string;
  items?: SalesOrderLineItem[];
}

/**
 * Map a won opportunity (with optional estimate line items) to an ERPNext Sales Order.
 *
 * IMPORTANT: The sync handler (sync-opportunity.ts) is responsible for resolving
 * accountId to the ERPNext Customer docname from erp_sync_map before calling
 * this function. The value passed as accountId must be the ERPNext Customer
 * docname, NOT the KrewPact UUID, or ERPNext customer field validation will fail.
 */
export function mapWonDealToSalesOrder(input: SalesOrderMapInput): Record<string, unknown> {
  return {
    doctype: 'Sales Order',
    customer: input.accountId || '',
    transaction_date: input.wonDate,
    delivery_date: input.wonDate,
    currency: 'CAD',
    krewpact_id: input.opportunityId,
    title: input.opportunityName,
    items:
      input.items && input.items.length > 0
        ? input.items.map((item, idx) => ({
            idx: idx + 1,
            item_name: item.description,
            qty: item.quantity,
            rate: item.rate,
            amount: item.amount,
          }))
        : [
            {
              idx: 1,
              item_name: input.opportunityName,
              qty: 1,
              rate: input.estimatedRevenue || 0,
              amount: input.estimatedRevenue || 0,
            },
          ],
  };
}

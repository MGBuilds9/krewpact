/**
 * Stock summary type definitions.
 */

export interface StockFilters {
  divisionId?: string;
  locationId?: string;
  itemId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface StockSummaryRow {
  item_id: string;
  item_name: string;
  item_sku: string;
  location_id: string;
  location_name: string;
  spot_id: string | null;
  qty_on_hand: number;
  total_value: number;
  last_transaction_at: string | null;
}

export interface LowStockItem {
  item_id: string;
  item_name: string;
  item_sku: string;
  location_id: string;
  location_name: string;
  qty_on_hand: number;
  min_stock_level: number;
  deficit: number;
}

export interface ProjectMaterialItem {
  item_id: string;
  item_name: string;
  total_qty: number;
  total_value: number;
}

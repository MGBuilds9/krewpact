/**
 * Maps KrewPact stock entry data to ERPNext Stock Entry doctype format.
 * Pure function — no side effects or database calls.
 */

export interface StockEntryMapInput {
  id: string;
  entry_type: 'Material Receipt' | 'Material Issue' | 'Material Transfer';
  posting_date: string;
  posting_time: string | null;
  project_name: string | null;
  remarks: string | null;
  items: StockEntryItemInput[];
}

export interface StockEntryItemInput {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  uom: string;
  basic_rate: number;
  source_warehouse: string | null;
  target_warehouse: string | null;
}

/**
 * Map a KrewPact stock entry to an ERPNext Stock Entry document.
 */
export function mapStockEntryToErp(entry: StockEntryMapInput): Record<string, unknown> {
  return {
    naming_series: 'MAT-STE-.YYYY.-',
    stock_entry_type: entry.entry_type,
    posting_date: entry.posting_date,
    posting_time: entry.posting_time || '00:00:00',
    currency: 'CAD',
    krewpact_id: entry.id,
    remarks: entry.remarks || '',
    ...(entry.project_name ? { project: entry.project_name } : {}),
    items: entry.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      uom: item.uom || 'Nos',
      basic_rate: item.basic_rate,
      s_warehouse: item.source_warehouse || '',
      t_warehouse: item.target_warehouse || '',
    })),
  };
}

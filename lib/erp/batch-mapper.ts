/**
 * Maps KrewPact batch data to ERPNext Batch doctype format.
 * Pure function — no side effects or database calls.
 */

export interface BatchMapInput {
  id: string;
  batch_id: string;
  item_code: string;
  item_name: string;
  expiry_date: string | null;
  manufacturing_date: string | null;
  description: string | null;
}

/**
 * Map a KrewPact batch to an ERPNext Batch document.
 */
export function mapBatchToErp(batch: BatchMapInput): Record<string, unknown> {
  return {
    batch_id: batch.batch_id,
    item: batch.item_code,
    item_name: batch.item_name,
    description: batch.description || batch.item_name,
    krewpact_id: batch.id,
    ...(batch.expiry_date ? { expiry_date: batch.expiry_date } : {}),
    ...(batch.manufacturing_date
      ? { manufacturing_date: batch.manufacturing_date }
      : {}),
  };
}

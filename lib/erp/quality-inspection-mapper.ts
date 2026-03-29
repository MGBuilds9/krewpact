/**
 * Maps KrewPact quality inspection data to ERPNext Quality Inspection doctype format.
 * Pure function — no side effects or database calls.
 */

export interface QualityInspectionMapInput {
  id: string;
  inspection_type: 'Incoming' | 'Outgoing' | 'In Process';
  reference_type: string;
  reference_name: string;
  item_code: string;
  item_name: string;
  sample_size: number;
  inspected_by: string | null;
  inspection_date: string;
  remarks: string | null;
  readings: QualityReadingInput[];
}

export interface QualityReadingInput {
  specification: string;
  value: string;
  min_value: number | null;
  max_value: number | null;
  status: 'Accepted' | 'Rejected';
}

/**
 * Map a KrewPact quality inspection to an ERPNext Quality Inspection document.
 */
export function mapQualityInspectionToErp(
  qi: QualityInspectionMapInput,
): Record<string, unknown> {
  return {
    naming_series: 'QI-.YYYY.-',
    inspection_type: qi.inspection_type,
    reference_type: qi.reference_type,
    reference_name: qi.reference_name,
    item_code: qi.item_code,
    item_name: qi.item_name,
    sample_size: qi.sample_size,
    inspected_by: qi.inspected_by || '',
    report_date: qi.inspection_date,
    remarks: qi.remarks || '',
    krewpact_id: qi.id,
    readings: qi.readings.map((r, idx) => ({
      idx: idx + 1,
      specification: r.specification,
      value: r.value,
      min_value: r.min_value ?? 0,
      max_value: r.max_value ?? 0,
      status: r.status,
    })),
  };
}

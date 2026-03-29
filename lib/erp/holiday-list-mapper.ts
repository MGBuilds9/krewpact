/**
 * Maps KrewPact holiday list data to ERPNext Holiday List doctype format.
 * Pure function — no side effects or database calls.
 */

export interface HolidayListMapInput {
  id: string;
  holiday_list_name: string;
  from_date: string;
  to_date: string;
  company: string;
  holidays: HolidayInput[];
}

export interface HolidayInput {
  holiday_date: string;
  description: string;
}

/**
 * Map a KrewPact holiday list to an ERPNext Holiday List document.
 */
export function mapHolidayListToErp(hl: HolidayListMapInput): Record<string, unknown> {
  return {
    holiday_list_name: hl.holiday_list_name,
    from_date: hl.from_date,
    to_date: hl.to_date,
    company: hl.company,
    krewpact_id: hl.id,
    holidays: hl.holidays.map((h, idx) => ({
      idx: idx + 1,
      holiday_date: h.holiday_date,
      description: h.description,
    })),
  };
}

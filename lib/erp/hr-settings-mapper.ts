/**
 * Maps ERPNext HR Settings doctype to/from KrewPact format.
 * HR Settings is a singleton (one document per company).
 * Pure function — no side effects or database calls.
 */

export interface HrSettingsErpResponse {
  name: string;
  retirement_age: number;
  standard_working_hours: number;
  leave_approval_notification_template: string | null;
  leave_status_notification_template: string | null;
  emp_created_by: string;
  creation: string;
  modified: string;
}

export interface HrSettingsMapped {
  retirement_age: number;
  standard_working_hours: number;
  emp_created_by: string;
}

/**
 * Map an ERPNext HR Settings document to KrewPact format.
 */
export function mapHrSettingsFromErp(settings: HrSettingsErpResponse): HrSettingsMapped {
  return {
    retirement_age: settings.retirement_age,
    standard_working_hours: settings.standard_working_hours,
    emp_created_by: settings.emp_created_by,
  };
}

export interface HrSettingsUpdateInput {
  retirement_age?: number;
  standard_working_hours?: number;
}

/**
 * Map KrewPact HR settings update to ERPNext format.
 */
export function mapHrSettingsToErp(input: HrSettingsUpdateInput): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (input.retirement_age !== undefined) {
    result.retirement_age = input.retirement_age;
  }
  if (input.standard_working_hours !== undefined) {
    result.standard_working_hours = input.standard_working_hours;
  }
  return result;
}

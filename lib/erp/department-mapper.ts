/**
 * Maps KrewPact division data to ERPNext Department doctype format.
 * Department maps to divisions — the division_id mapping must be consistent.
 * Pure function — no side effects or database calls.
 */

export interface DepartmentMapInput {
  id: string;
  department_name: string;
  company: string;
  parent_department: string | null;
  is_group: boolean;
}

/**
 * Map a KrewPact division to an ERPNext Department document.
 */
export function mapDepartmentToErp(dept: DepartmentMapInput): Record<string, unknown> {
  return {
    name: dept.department_name,
    department_name: dept.department_name,
    company: dept.company,
    parent_department: dept.parent_department || '',
    is_group: dept.is_group ? 1 : 0,
    krewpact_id: dept.id,
  };
}

/**
 * Maps KrewPact user data to ERPNext Employee doctype format.
 * Pure function — no side effects or database calls.
 *
 * Employee is the bridge between HR data and KrewPact users.
 * The krewpact_user_id custom field on ERPNext Employee links to the users table.
 */

export interface EmployeeMapInput {
  id: string;
  employee_name: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_joining: string;
  date_of_birth: string | null;
  gender: string | null;
  company: string;
  department: string | null;
  designation: string | null;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Left';
}

/**
 * Map a KrewPact user to an ERPNext Employee document.
 */
export function mapEmployeeToErp(emp: EmployeeMapInput): Record<string, unknown> {
  return {
    naming_series: 'HR-EMP-.YYYY.-',
    employee_name: emp.employee_name,
    first_name: emp.first_name,
    last_name: emp.last_name || '',
    company_email: emp.email,
    date_of_joining: emp.date_of_joining,
    date_of_birth: emp.date_of_birth || '',
    gender: emp.gender || 'Prefer not to say',
    company: emp.company,
    department: emp.department || '',
    designation: emp.designation || '',
    status: emp.status,
    krewpact_user_id: emp.id,
  };
}

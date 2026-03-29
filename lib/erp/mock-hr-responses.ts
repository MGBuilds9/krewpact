/**
 * Mock ERPNext HR/Organization chain response generators.
 * Employee, Attendance, Leave Application, Holiday List,
 * Designation, Department, HR Settings, Company.
 */

import { nextMockId } from './mock-types';

/**
 * Generate a mock ERPNext Employee response.
 */
export function mockEmployeeResponse(emp: {
  id: string;
  employee_name: string;
  company: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('HR-EMP');
  return {
    doctype: 'Employee',
    name: docname,
    data: {
      name: docname,
      doctype: 'Employee',
      employee_name: emp.employee_name,
      company: emp.company,
      status: 'Active',
      krewpact_user_id: emp.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Attendance response.
 */
export function mockAttendanceResponse(att: {
  id: string;
  employee: string;
  attendance_date: string;
  status: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('HR-ATT');
  return {
    doctype: 'Attendance',
    name: docname,
    data: {
      name: docname,
      doctype: 'Attendance',
      employee: att.employee,
      attendance_date: att.attendance_date,
      status: att.status,
      krewpact_id: att.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Leave Application response.
 */
export function mockLeaveApplicationResponse(leave: {
  id: string;
  employee: string;
  leave_type: string;
  from_date: string;
  to_date: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('HR-LAP');
  return {
    doctype: 'Leave Application',
    name: docname,
    data: {
      name: docname,
      doctype: 'Leave Application',
      employee: leave.employee,
      leave_type: leave.leave_type,
      from_date: leave.from_date,
      to_date: leave.to_date,
      status: 'Open',
      krewpact_id: leave.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Holiday List response.
 */
export function mockHolidayListResponse(hl: {
  id: string;
  holiday_list_name: string;
  from_date: string;
  to_date: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('HL');
  return {
    doctype: 'Holiday List',
    name: docname,
    data: {
      name: docname,
      doctype: 'Holiday List',
      holiday_list_name: hl.holiday_list_name,
      from_date: hl.from_date,
      to_date: hl.to_date,
      krewpact_id: hl.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Designation response.
 */
export function mockDesignationResponse(desg: {
  name: string;
  designation: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'Designation',
    name: desg.name,
    data: {
      name: desg.name,
      doctype: 'Designation',
      designation: desg.designation,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Department response.
 */
export function mockDepartmentResponse(dept: {
  id: string;
  department_name: string;
  company: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  const docname = nextMockId('DEPT');
  return {
    doctype: 'Department',
    name: docname,
    data: {
      name: docname,
      doctype: 'Department',
      department_name: dept.department_name,
      company: dept.company,
      is_group: 0,
      krewpact_id: dept.id,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext HR Settings response (singleton).
 */
export function mockHrSettingsResponse(): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'HR Settings',
    name: 'HR Settings',
    data: {
      name: 'HR Settings',
      doctype: 'HR Settings',
      retirement_age: 65,
      standard_working_hours: 8,
      emp_created_by: 'Naming Series',
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

/**
 * Generate a mock ERPNext Company response.
 */
export function mockCompanyResponse(company: {
  name: string;
  company_name: string;
}): {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
} {
  return {
    doctype: 'Company',
    name: company.name,
    data: {
      name: company.name,
      doctype: 'Company',
      company_name: company.company_name,
      abbr: company.company_name.slice(0, 3).toUpperCase(),
      default_currency: 'CAD',
      country: 'Canada',
      krewpact_id: company.name,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
      docstatus: 0,
    },
  };
}

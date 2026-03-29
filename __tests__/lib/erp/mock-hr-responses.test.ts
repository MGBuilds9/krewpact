import { beforeEach, describe, expect, it } from 'vitest';

import {
  mockAttendanceResponse,
  mockCompanyResponse,
  mockDepartmentResponse,
  mockDesignationResponse,
  mockEmployeeResponse,
  mockHolidayListResponse,
  mockHrSettingsResponse,
  mockLeaveApplicationResponse,
} from '@/lib/erp/mock-hr-responses';
import { resetMockCounter } from '@/lib/erp/mock-types';

describe('mock-hr-responses', () => {
  beforeEach(() => {
    resetMockCounter();
  });

  describe('mockEmployeeResponse', () => {
    it('generates a valid Employee response', () => {
      const result = mockEmployeeResponse({
        id: 'user-001',
        employee_name: 'John Smith',
        company: 'MDM Group Inc.',
      });

      expect(result.doctype).toBe('Employee');
      expect(result.name).toMatch(/^HR-EMP-MOCK-/);
      expect(result.data.employee_name).toBe('John Smith');
      expect(result.data.company).toBe('MDM Group Inc.');
      expect(result.data.krewpact_user_id).toBe('user-001');
      expect(result.data.status).toBe('Active');
    });
  });

  describe('mockAttendanceResponse', () => {
    it('generates a valid Attendance response', () => {
      const result = mockAttendanceResponse({
        id: 'att-001',
        employee: 'HR-EMP-001',
        attendance_date: '2026-03-29',
        status: 'Present',
      });

      expect(result.doctype).toBe('Attendance');
      expect(result.name).toMatch(/^HR-ATT-MOCK-/);
      expect(result.data.employee).toBe('HR-EMP-001');
      expect(result.data.attendance_date).toBe('2026-03-29');
      expect(result.data.status).toBe('Present');
      expect(result.data.krewpact_id).toBe('att-001');
    });
  });

  describe('mockLeaveApplicationResponse', () => {
    it('generates a valid Leave Application response', () => {
      const result = mockLeaveApplicationResponse({
        id: 'leave-001',
        employee: 'HR-EMP-001',
        leave_type: 'Casual Leave',
        from_date: '2026-04-01',
        to_date: '2026-04-03',
      });

      expect(result.doctype).toBe('Leave Application');
      expect(result.name).toMatch(/^HR-LAP-MOCK-/);
      expect(result.data.employee).toBe('HR-EMP-001');
      expect(result.data.leave_type).toBe('Casual Leave');
      expect(result.data.from_date).toBe('2026-04-01');
      expect(result.data.to_date).toBe('2026-04-03');
      expect(result.data.krewpact_id).toBe('leave-001');
    });
  });

  describe('mockHolidayListResponse', () => {
    it('generates a valid Holiday List response', () => {
      const result = mockHolidayListResponse({
        id: 'hl-001',
        holiday_list_name: 'Ontario Statutory 2026',
        from_date: '2026-01-01',
        to_date: '2026-12-31',
      });

      expect(result.doctype).toBe('Holiday List');
      expect(result.name).toMatch(/^HL-MOCK-/);
      expect(result.data.holiday_list_name).toBe('Ontario Statutory 2026');
      expect(result.data.from_date).toBe('2026-01-01');
      expect(result.data.to_date).toBe('2026-12-31');
      expect(result.data.krewpact_id).toBe('hl-001');
    });
  });

  describe('mockDesignationResponse', () => {
    it('generates a valid Designation response', () => {
      const result = mockDesignationResponse({
        name: 'Project Manager',
        designation: 'Project Manager',
      });

      expect(result.doctype).toBe('Designation');
      expect(result.name).toBe('Project Manager');
      expect(result.data.designation).toBe('Project Manager');
    });
  });

  describe('mockDepartmentResponse', () => {
    it('generates a valid Department response', () => {
      const result = mockDepartmentResponse({
        id: 'div-001',
        department_name: 'MDM Contracting',
        company: 'MDM Group Inc.',
      });

      expect(result.doctype).toBe('Department');
      expect(result.name).toMatch(/^DEPT-MOCK-/);
      expect(result.data.department_name).toBe('MDM Contracting');
      expect(result.data.company).toBe('MDM Group Inc.');
      expect(result.data.krewpact_id).toBe('div-001');
    });
  });

  describe('mockHrSettingsResponse', () => {
    it('generates a valid HR Settings response (singleton)', () => {
      const result = mockHrSettingsResponse();

      expect(result.doctype).toBe('HR Settings');
      expect(result.name).toBe('HR Settings');
      expect(result.data.retirement_age).toBe(65);
      expect(result.data.standard_working_hours).toBe(8);
      expect(result.data.emp_created_by).toBe('Naming Series');
    });
  });

  describe('mockCompanyResponse', () => {
    it('generates a valid Company response', () => {
      const result = mockCompanyResponse({
        name: 'MDM Group Inc.',
        company_name: 'MDM Group Inc.',
      });

      expect(result.doctype).toBe('Company');
      expect(result.name).toBe('MDM Group Inc.');
      expect(result.data.company_name).toBe('MDM Group Inc.');
      expect(result.data.default_currency).toBe('CAD');
      expect(result.data.country).toBe('Canada');
    });
  });

  describe('sequential mock IDs', () => {
    it('generates unique sequential IDs across HR doctypes', () => {
      const emp = mockEmployeeResponse({
        id: 'u-1',
        employee_name: 'A',
        company: 'X',
      });
      const att = mockAttendanceResponse({
        id: 'a-1',
        employee: 'E-1',
        attendance_date: '2026-01-01',
        status: 'Present',
      });
      const dept = mockDepartmentResponse({
        id: 'd-1',
        department_name: 'D',
        company: 'X',
      });

      expect(emp.name).not.toBe(att.name);
      expect(att.name).not.toBe(dept.name);
    });
  });
});

import type { DivisionCode } from '@/lib/validators/org';

export const TOTAL_STEPS = 4;

export const DIVISION_LABELS: Record<DivisionCode, string> = {
  contracting: 'MDM Contracting',
  homes: 'MDM Homes',
  wood: 'MDM Wood',
  telecom: 'MDM Telecom',
  'group-inc': 'MDM Group Inc.',
  management: 'MDM Management',
};

export const INTERNAL_ROLES = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'executive', label: 'Executive' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'project_coordinator', label: 'Project Coordinator' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'field_supervisor', label: 'Field Supervisor' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'payroll_admin', label: 'Payroll Admin' },
];

export interface PendingInvite {
  email: string;
  role: string;
}

import { INTERNAL_ROLES as REGISTRY_INTERNAL_ROLES } from '@/lib/rbac/role-registry';
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

// Re-export with `value` shape for backwards compatibility with onboarding UI
export const INTERNAL_ROLES = REGISTRY_INTERNAL_ROLES.map((r) => ({ value: r.key, label: r.label }));

export interface PendingInvite {
  email: string;
  role: string;
}

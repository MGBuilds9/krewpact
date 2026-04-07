import { useMemo } from 'react';

import { useOrg } from '@/contexts/OrgContext';

export interface SetupStep {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
}

const DEFAULT_PRIMARY_COLOR = '#2563eb';

export function useSetupProgress() {
  const { currentOrg } = useOrg();

  return useMemo(() => {
    if (!currentOrg) return { steps: [], completed: 0, total: 0, isDismissed: true };

    const metadata = currentOrg.metadata ?? {};
    const isDismissed = metadata.setup_checklist_dismissed === true;
    const branding = currentOrg.branding ?? {};
    const flags = currentOrg.feature_flags ?? {};

    const steps: SetupStep[] = [
      {
        key: 'branding',
        label: 'Customize branding',
        description: 'Add your logo and brand colors',
        completed:
          Boolean(branding.logo_url) ||
          (!!branding.primary_color && branding.primary_color !== DEFAULT_PRIMARY_COLOR),
        href: '/settings/branding',
      },
      {
        key: 'modules',
        label: 'Enable modules',
        description: 'Choose which features your team can access',
        completed: Object.values(flags).some((v) => v === true),
        href: '/settings/features',
      },
      {
        key: 'team',
        label: 'Invite team members',
        description: 'Add your first team members',
        completed: Boolean(metadata.team_invited),
        href: '/team',
      },
      {
        key: 'profile',
        label: 'Complete company profile',
        description: 'Fill in your company details',
        completed: Boolean(metadata.profile_completed),
        href: '/settings',
      },
    ];

    const completed = steps.filter((s) => s.completed).length;
    return { steps, completed, total: steps.length, isDismissed };
  }, [currentOrg]);
}

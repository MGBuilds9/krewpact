'use client';

import { Lock } from 'lucide-react';
import { ReactNode } from 'react';

import { useOrg } from '@/contexts/OrgContext';
import { useUserRBAC } from '@/hooks/useRBAC';

import { EmptyState } from './EmptyState';

interface FeatureGateProps {
  flag: string;
  children: ReactNode;
}

export function FeatureGate({ flag, children }: FeatureGateProps) {
  const { currentOrg, isLoading } = useOrg();
  const { isAdmin } = useUserRBAC();

  if (isLoading) return null;
  if (isAdmin) return <>{children}</>;

  const flags = currentOrg?.feature_flags ?? {};
  if (flags[flag]) return <>{children}</>;

  return (
    <EmptyState
      icon={<Lock className="h-12 w-12" />}
      title="Feature not available"
      description="This feature is not enabled for your organization. Contact your administrator for access."
    />
  );
}

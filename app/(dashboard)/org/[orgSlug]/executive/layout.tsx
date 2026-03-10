'use client';

import { useUserRBAC } from '@/hooks/useRBAC';
import { ExecutiveNav } from '@/components/Executive/ExecutiveNav';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';

const EXECUTIVE_ROLES = ['executive', 'platform_admin', 'CEO', 'CFO', 'COO', 'IT_ADMIN'];

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  const { hasRole, isLoading } = useUserRBAC();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const canAccess = EXECUTIVE_ROLES.some((role) => hasRole(role));

  if (!canAccess) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
        <p className="text-muted-foreground">
          The Executive Nucleus is restricted to C-suite and IT leadership.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Nucleus</h1>
        <p className="text-sm text-muted-foreground mt-1">MDM Group operational intelligence</p>
      </div>
      <ExecutiveNav />
      {children}
    </div>
  );
}

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

export interface OrgBranding {
  company_name?: string;
  primary_color?: string;
  logo_url?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  locale: string;
  metadata: Record<string, unknown>;
  branding: OrgBranding;
  feature_flags: Record<string, boolean>;
}

export interface OrgContextType {
  currentOrg: Organization | null;
  orgSlug: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || 'default';

  const {
    data: currentOrg = null,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['org', orgSlug],
    queryFn: () => apiFetch<Organization>(`/api/org/${orgSlug}`),
    enabled: !!orgSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        orgSlug,
        isLoading,
        isError,
        error: error as Error | null,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}

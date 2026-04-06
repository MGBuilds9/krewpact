'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import React, { createContext, ReactNode, useContext, useMemo } from 'react';

import { ApiError, apiFetch } from '@/lib/api-client';

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
  const orgSlug = params?.orgSlug as string;

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
    retry: (count, error) => count < 2 && (error as ApiError).status >= 500,
  });

  const contextValue = useMemo(
    () => ({
      currentOrg,
      orgSlug,
      isLoading,
      isError,
      error: error as Error | null,
    }),
    [currentOrg, orgSlug, isLoading, isError, error],
  );

  return <OrgContext.Provider value={contextValue}>{children}</OrgContext.Provider>;
}

const fallbackContext: OrgContextType = {
  currentOrg: null,
  orgSlug: '',
  isLoading: true,
  isError: false,
  error: null,
};

export function useOrg() {
  const context = useContext(OrgContext);
  return context ?? fallbackContext;
}

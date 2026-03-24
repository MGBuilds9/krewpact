'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch } from '@/lib/api-client';

export interface DivisionWithRole {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  manager_id: string | null;
  settings: unknown;
  created_at: string;
  updated_at: string;
  user_role: string;
  is_primary: boolean;
}

export interface DivisionContextType {
  activeDivision: DivisionWithRole | null;
  userDivisions: DivisionWithRole[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  setActiveDivision: (divisionId: string) => void;
  refreshDivisions: () => void;
  hasMultipleDivisions: boolean;
  canAccessDivision: (divisionId: string) => boolean;
  getDivisionRole: (divisionId: string) => string | null;
  allDivisions: { id: string; name: string; code: string | null }[];
  getDivisionName: (divisionId: string | null | undefined) => string;
}

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export function DivisionProvider({ children }: { children: ReactNode }) {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  const {
    data: userDivisions = [],
    isLoading,
    isError,
    error,
    refetch: refreshDivisions,
  } = useQuery({
    queryKey: ['user-divisions', currentUser?.id],
    queryFn: () =>
      apiFetch<DivisionWithRole[]>('/api/user/divisions', {
        params: { user_id: currentUser!.id },
      }),
    enabled: !!currentUser?.id,
  });

  const { data: allDivisions = [] } = useQuery({
    queryKey: ['org-divisions-all'],
    queryFn: () =>
      apiFetch<{ data: { id: string; name: string; code: string | null }[] }>(
        '/api/org/divisions?limit=100',
      ).then((res) => res.data),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Set active division on first load
  useEffect(() => {
    if (!hasInitialized.current && userDivisions.length > 0 && !activeDivisionId) {
      hasInitialized.current = true;
      const savedId =
        typeof window !== 'undefined' ? localStorage.getItem('activeDivisionId') : null;
      if (savedId && userDivisions.some((d) => d.id === savedId)) {
        queueMicrotask(() => setActiveDivisionId(savedId));
      } else {
        const primary = userDivisions.find((d) => d.is_primary);
        const newId = primary ? primary.id : userDivisions[0].id;
        queueMicrotask(() => setActiveDivisionId(newId));
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeDivisionId', newId);
        }
      }
    }
  }, [userDivisions, activeDivisionId]);

  const activeDivision = userDivisions.find((d) => d.id === activeDivisionId) || null;

  const setActiveDivision = (divisionId: string) => {
    const hasAccess = userDivisions.some((d) => d.id === divisionId);
    if (!hasAccess) return;

    setActiveDivisionId(divisionId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeDivisionId', divisionId);
    }
    queryClient.invalidateQueries();
  };

  const hasMultipleDivisions = userDivisions.length > 1;

  const canAccessDivision = (divisionId: string): boolean =>
    userDivisions.some((d) => d.id === divisionId);

  const getDivisionRole = (divisionId: string): string | null => {
    const division = userDivisions.find((d) => d.id === divisionId);
    return division?.user_role || null;
  };

  const getDivisionName = (divisionId: string | null | undefined): string => {
    if (!divisionId) return 'All Divisions';
    return allDivisions.find((d) => d.id === divisionId)?.name ?? 'Unknown Division';
  };

  return (
    <DivisionContext.Provider
      value={{
        activeDivision,
        userDivisions,
        isLoading,
        isError,
        error: error as Error | null,
        setActiveDivision,
        refreshDivisions,
        hasMultipleDivisions,
        canAccessDivision,
        getDivisionRole,
        allDivisions,
        getDivisionName,
      }}
    >
      {children}
    </DivisionContext.Provider>
  );
}

export function useDivision() {
  const context = useContext(DivisionContext);
  if (context === undefined) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
}

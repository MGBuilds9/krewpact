'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch } from '@/lib/api-client';
import { divisionScopedQueryKeys, invalidateQueryFamilies } from '@/lib/query-cache';

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

/**
 * Sentinel value representing the "All Divisions" view scope.
 *
 * When `activeDivision.id === ALL_DIVISIONS_ID`, the user has chosen to view
 * data from every division they have access to (subject to RLS). Read-side
 * consumers must call {@link getDivisionFilter} to translate this back into
 * `undefined` for query params; write-side consumers must call
 * {@link requireConcreteDivision} to refuse the sentinel before submitting
 * a mutation (you cannot create an entity scoped to "all divisions").
 *
 * The sentinel ID is intentionally NOT a valid UUID so it cannot be confused
 * with a real division ID at any layer (DB, RLS policy, query param parser).
 */
export const ALL_DIVISIONS_ID = '__all_divisions__' as const;

export const ALL_DIVISIONS: DivisionWithRole = {
  id: ALL_DIVISIONS_ID,
  name: 'All Divisions',
  code: null,
  description: 'View data from every division you have access to',
  is_active: true,
  manager_id: null,
  settings: null,
  created_at: '',
  updated_at: '',
  user_role: 'viewer',
  is_primary: false,
};

/**
 * Returns true when the given division is the synthetic "All Divisions" sentinel.
 */
export function isAllDivisions(division: DivisionWithRole | null | undefined): boolean {
  return !!division && division.id === ALL_DIVISIONS_ID;
}

/**
 * Read-side helper. Translates the active division into a `division_id` filter
 * value for API queries. Returns `undefined` when the user has selected
 * "All Divisions" so the query is unscoped (still subject to RLS).
 *
 * Use this in EVERY read-filter consumer that previously did
 * `divisionId: activeDivision?.id`.
 */
export function getDivisionFilter(
  division: DivisionWithRole | null | undefined,
): string | undefined {
  if (!division) return undefined;
  if (division.id === ALL_DIVISIONS_ID) return undefined;
  return division.id;
}

/**
 * Write-side helper. Refuses the "All Divisions" sentinel and returns a real
 * division ID for use in mutations. If the active division is the sentinel,
 * falls back to the user's primary division (or the first available division
 * if there is no primary).
 *
 * Returns `null` if there is no concrete division to use — caller MUST handle
 * this case (typically by disabling the form submit and showing a "select a
 * division to continue" hint).
 *
 * Use this in EVERY write-mutation consumer that previously did
 * `division_id: activeDivision?.id`.
 */
export function requireConcreteDivision(
  active: DivisionWithRole | null | undefined,
  available: DivisionWithRole[],
): string | null {
  if (active && active.id !== ALL_DIVISIONS_ID) return active.id;
  const primary = available.find((d) => d.is_primary);
  if (primary) return primary.id;
  if (available.length > 0) return available[0].id;
  return null;
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
  return (
    <DivisionProviderInner
      key={currentUser?.id ?? 'anonymous'}
      currentUserId={currentUser?.id ?? null}
    >
      {children}
    </DivisionProviderInner>
  );
}

// eslint-disable-next-line max-lines-per-function
function DivisionProviderInner({
  children,
  currentUserId,
}: {
  children: ReactNode;
  currentUserId: string | null;
}) {
  const queryClient = useQueryClient();
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const {
    data: userDivisions = [],
    isLoading,
    isError,
    error,
    refetch: refreshDivisions,
  } = useQuery({
    queryKey: ['user-divisions', currentUserId],
    queryFn: () =>
      apiFetch<DivisionWithRole[]>('/api/user/divisions', { params: { user_id: currentUserId! } }),
    enabled: !!currentUserId,
  });

  const { data: allDivisions = [] } = useQuery({
    queryKey: ['org-divisions-all'],
    queryFn: () =>
      apiFetch<{ data: { id: string; name: string; code: string | null }[] }>(
        '/api/org/divisions?limit=100',
      ).then((res) => res.data),
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!hasInitialized.current && userDivisions.length > 0 && !activeDivisionId) {
      hasInitialized.current = true;
      const savedId =
        typeof window !== 'undefined' ? localStorage.getItem('activeDivisionId') : null;
      // Accept the ALL_DIVISIONS sentinel from localStorage if the user previously chose it.
      // Boot tolerance: any unrecognized saved ID (e.g. a stale division the user no longer
      // has access to, OR an old sentinel value if we ever change the constant) silently
      // falls back to primary — never strands users on an invalid state.
      if (savedId === ALL_DIVISIONS_ID) {
        queueMicrotask(() => setActiveDivisionId(ALL_DIVISIONS_ID));
      } else if (savedId && userDivisions.some((d) => d.id === savedId)) {
        queueMicrotask(() => setActiveDivisionId(savedId));
      } else {
        const primary = userDivisions.find((d) => d.is_primary);
        const newId = primary ? primary.id : userDivisions[0].id;
        queueMicrotask(() => setActiveDivisionId(newId));
        if (typeof window !== 'undefined') localStorage.setItem('activeDivisionId', newId);
      }
    }
  }, [userDivisions, activeDivisionId]);

  const activeDivision = useMemo(() => {
    if (activeDivisionId === ALL_DIVISIONS_ID) return ALL_DIVISIONS;
    return userDivisions.find((d) => d.id === activeDivisionId) || null;
  }, [userDivisions, activeDivisionId]);
  const hasMultipleDivisions = userDivisions.length > 1;
  const canAccessDivision = useCallback(
    (divisionId: string) => userDivisions.some((d) => d.id === divisionId),
    [userDivisions],
  );
  const getDivisionRole = useCallback(
    (divisionId: string) => userDivisions.find((d) => d.id === divisionId)?.user_role || null,
    [userDivisions],
  );
  const getDivisionName = useCallback(
    (divisionId: string | null | undefined) =>
      !divisionId
        ? 'All Divisions'
        : (allDivisions.find((d) => d.id === divisionId)?.name ?? 'Unknown Division'),
    [allDivisions],
  );

  const setActiveDivision = useCallback(
    (divisionId: string) => {
      // Accept the ALL_DIVISIONS sentinel OR any concrete division the user has access to.
      // Reject anything else silently (caller can never set "some other org's division").
      const isSentinel = divisionId === ALL_DIVISIONS_ID;
      if (!isSentinel && !userDivisions.some((d) => d.id === divisionId)) return;
      setActiveDivisionId(divisionId);
      if (typeof window !== 'undefined') localStorage.setItem('activeDivisionId', divisionId);
      void invalidateQueryFamilies(queryClient, divisionScopedQueryKeys);
    },
    [queryClient, userDivisions],
  );

  const contextValue = useMemo(
    () => ({
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
    }),
    [
      activeDivision,
      userDivisions,
      isLoading,
      isError,
      error,
      setActiveDivision,
      refreshDivisions,
      hasMultipleDivisions,
      canAccessDivision,
      getDivisionRole,
      allDivisions,
      getDivisionName,
    ],
  );

  return <DivisionContext.Provider value={contextValue}>{children}</DivisionContext.Provider>;
}

export function useDivision() {
  const context = useContext(DivisionContext);
  if (context === undefined) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
}
